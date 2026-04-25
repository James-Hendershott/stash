# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root unless noted. The project is an npm workspaces monorepo; root scripts delegate into `packages/*`.

### Local dev (Docker)
```bash
# One-time setup
cp .env.example .env
npm install

# Start postgres + backend (hot reload via nodemon/tsx) + admin (Vite)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Stop (add -v to wipe ./data volumes)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```
Dev ports: postgres `5434` (→ internal 5432), backend `3001`, admin `3002`.
`docker-compose.dev.yml` bind-mounts `packages/*/src` into the containers, so edits hot-reload without rebuilding the image.

### Database (Prisma)
Prisma runs on the **host**, not in Docker, so you must override `DATABASE_URL` to hit the exposed port `5434`:
```bash
cd packages/backend
DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" npx prisma migrate dev --name <name>
DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" npx prisma db seed
DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" npx prisma studio   # http://localhost:5555
```
Root helpers: `npm run db:migrate`, `db:seed`, `db:studio` (they forward to `packages/backend` but still need the `DATABASE_URL` override in dev).

Seed users: `jameshendershott85@gmail.com` (admin) and `mama.shotts@gmail.com` (user). Initial password defaults to a placeholder unless `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` are set in env — see the warning printed by `prisma db seed`.

### Build / lint / format
```bash
npm run build            # shared → backend → admin (order matters; backend & admin depend on @stash/shared)
npm run build:shared     # must rebuild after editing packages/shared before backend/admin typecheck
npm run lint             # eslint packages/*/src --ext .ts,.tsx
npm run format           # prettier write
npm run format:check
```
There is **no test suite** in this repo — don't fabricate `npm test`. Verify changes via the running dev stack, `curl`, and Prisma Studio.

### Running individual packages outside Docker
```bash
npm run dev:backend      # nodemon, needs DATABASE_URL pointing at localhost:5434 (or a running stash-postgres)
npm run dev:admin        # Vite on 3002
cd packages/mobile && npx expo start --tunnel   # Expo Go on phone; set server URL to LAN IP:3001
```

### Production (Unraid)
Code lives at `/mnt/user/appdata/stash/repo`; data at `/mnt/user/appdata/stash/{postgres,images,qrcodes,exports,floorplans}`. Deploy loop:
```bash
ssh unraid
cd /mnt/user/appdata/stash/repo && git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec stash-backend npx prisma migrate deploy   # only if schema changed
```

## Architecture

### Workspace layout
Four npm workspaces under `packages/`:
- `shared` — pure-TS types, enums, constants, and formatting utils. **Consumed by all other packages via `@stash/shared`.** Must be rebuilt (`npm run build:shared`) before backend/admin will typecheck against new changes.
- `backend` — Express + Prisma API. Entry `src/index.ts` mounts routers from `src/routes/*`; every router except `auth` applies `requireAuth` at the top.
- `admin` — React 18 + Vite SPA. Routes in `src/App.tsx`, all app pages behind `<ProtectedRoute>` + `<Layout>`.
- `mobile` — React Native + Expo SDK 54. Entry `App.tsx`; screens in `src/screens`. WatermelonDB offline sync requires a **custom dev build** — Expo Go alone is not enough for offline mode.

### Data model (see `packages/backend/prisma/schema.prisma`)
- **Item** is the central entity. An Item with `isContainer=true` has a companion **Container** row (1:1 via `Container.itemId`) that carries internal dimensions and container type. This dual-table pattern means "a container is just an item with extra geometry" — code that operates on items may also need to handle the container side.
- **ItemPlacement** is the history of which item sits in which container. `placedAt`/`removedAt` make it a temporal log — do not delete rows, set `removedAt` instead.
- **Item.deletedAt** is the soft-delete marker. All list queries filter `{ deletedAt: null }`; sync endpoints use `deletedAt != null` to send deletions to mobile.
- **BookDetails** is a second sidecar — 1:1 with `Item` via `BookDetails.itemId`. Same dual-table reasoning as `Container`: a book is still an Item with a fate / room / photo / placement, plus bibliographic data (ISBN, edition, binding, cover URL) that doesn't apply to non-books. **No in-app AI** — the bulk pipeline is: photos → free chat UI (Claude.ai / ChatGPT) → text list → `scripts/enrich-books.mjs` (OpenLibrary + Google Books, free) → CSV → `POST /api/books/import-csv`. See `GUIDE.md` "Bulk Cataloging Books" and `BUILD_LOG.md` Chapter 21 for the full design rationale.
- **Location** has two `LocationType`s: `ORIGIN` (Colorado rooms) and `DESTINATION` (NC rooms). Items carry both `originLocationId` (required) and `destinationLocationId` (optional, for move planning).
- **Fate** enum (KEEP/SELL/DONATE/TRASH/UNDECIDED) drives most of the UI's filtering and export grouping.
- Prisma uses `@@map` to snake_case every table name. When writing raw SQL or reading `pg_dump`, tables are `items`, `item_placements`, `activity_logs`, etc.

### Backend request pipeline
1. `src/index.ts` — CORS, JSON body (10 MB limit), static mounts (`/api/files/*` serves `DATA_PATH`, `/api/public/*` serves `packages/backend/public`), then all routers.
2. Each router in `src/routes/*` calls `router.use(requireAuth)` at the top. `requireAuth` (in `src/middleware/auth.ts`) verifies the Bearer JWT and attaches `{ userId, role }` to `req.user`. `requireAdmin` must come **after** `requireAuth`.
3. Request bodies are validated through `src/middleware/validate.ts` + Zod schemas in `src/validators/*`.
4. DB access goes through the singleton `prisma` in `src/lib/prisma.ts`. Business logic that spans multiple tables lives in `src/services/*` (pricing via Claude API, QR generation, PDF export, CSV import).
5. File uploads use `multer` with disk storage under `DATA_PATH` (set to `./data` locally, `/mnt/user/appdata/stash` in prod). Photos, QR PNGs, exports, and floorplans are all on disk; only the relative path is stored in Postgres.

### Mobile sync
`POST /api/sync/pull` (in `routes/sync.ts`) implements WatermelonDB's pull protocol. It returns `{ changes: { items: {created, updated, deleted}, ... }, timestamp }`. First sync is detected by `lastPulledAt == null` and returns everything as "created". Soft-deleted items are reported via the `deleted` bucket.

### Env vars that matter (`src/config.ts`)
`BACKEND_PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ANTHROPIC_API_KEY` (required for `/api/pricing/*` — LLM price estimates call `claude-sonnet-4-6`), `BACKEND_URL`, `DATA_PATH`. `dataPath` is resolved relative to CWD, so the backend must run from its package root or get an absolute `DATA_PATH`.

### Admin frontend
Two context providers wrap everything: `AuthContext` (stores JWT in localStorage + exposes `login`/`logout`/`user`) and `ToastContext` (app-wide notifications). Single API client at `src/lib/api.ts`. No state management library — pages fetch on mount with `useEffect`.

## Teaching docs

This project maintains `BUILD_LOG.md` (chronological), `LEARN.md`
(topical), and `meta/teach-as-you-build/WORKFLOW.md` (playbooks), plus
HTML versions generated by `npm run build:wiki`.

Update all of these whenever a feature lands, a bug is fixed, or an
architectural decision is made. See the `teach-as-you-build` skill
for the format, voice, and regeneration flow.

## Conventions worth knowing

- **Don't edit `packages/*/dist`.** These are build outputs.
- **After editing `packages/shared`**, run `npm run build:shared` before other packages' TS will pick up the change (the admin Vite server will error otherwise).
- **After editing `schema.prisma`**, run `prisma migrate dev --name <desc>` (with the local-port `DATABASE_URL`). Never hand-edit files under `prisma/migrations/`.
- **Never bypass soft-delete** — don't hard-delete items; set `deletedAt`. The sync endpoint and all list queries assume this.
- **Static file URLs** are served from `/api/files/<subdir>/<file>`, not from the admin's origin. Paths in the DB (`photoPath`, `qrCodePath`) are stored relative to `DATA_PATH`.
- **Two compose files are always used together** in dev: `-f docker-compose.yml -f docker-compose.dev.yml`. The base file alone is production-shaped (no port for postgres, no bind mounts).
