# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here — current direction (read before doing anything)

**Stash is being rebuilt around storage, not the move.** As of 2026-09-28 the owners rent 1642 W Blue Flax Dr (Saratoga Springs, UT) and are unpacking old storage into standard totes kept in the garage (overhead shelves 1–9) and a storage unit (Lehi Indoor Storage #3204, racks 1–6). The core need: *know what's in a tote without opening it, and find any item fast — 100% from the phone.*

- **The spec is `SPEC.md`** (mirror of the vault note `D:\James_Journey\projects\active\stash\stash-v2-spec.md`). Read it before planning any work. It holds the data model, the decisions (ADR-001–006 in `LEARN.md` Part 1), and the **phased build order (Phases 0–6)**. Work proceeds phase by phase; each phase must be testable on the phone.
- **Back-burnered:** NC move, destination rooms, fate-based move planning, Home Mode. Don't extend these; don't delete them either.
- **Status:** **v1.5.1 is live in production** (deployed 2026-09-29, BUILD_LOG ch. 30): Phase 0 (v2 schema, locations, categories, tote models, per-item categories, unpack) and Phase 1 (Find it). Production: 703 items (431 books, 7 totes #1/#10–13/#20/#21, 265 other items), 64 locations. Awaiting James's phone test of Phase 1. Next: **Phase 1b — Visual storage maps** (garage layout in SPEC; storage unit measurements pending), then Phase 2 — Quick Add. `stash-postgres` was created by hand (no Compose labels): deploy with `--no-deps stash-backend stash-admin`. Old containers parked as `stash-backend-old` / `stash-admin-old` until the phone test passes.

## Session rules

1. **Follow the `teach-as-you-build` skill for every change.** Finishing a feature, fix, or decision means: a new `BUILD_LOG.md` chapter (ask → plan → steps → bugs → verifying → takeaways), `LEARN.md` updates (new decisions become ADRs in Part 1, Ch. 3), a `CHANGELOG.md` entry, then `npm run build:wiki`. Write these *before* committing, not after. James is learning engineering through this project — the docs are a deliverable.
2. **Destructive data operations need explicit confirmation.** Before deleting or bulk-changing production data: `pg_dump` backup first, show the exact list, wait for a yes.
3. **Keep docs mirrored.** `README.md`, `SETUP.md`, `GUIDE.md`, `IPHONE-GUIDE.md`, `TEACH.md`, `SPEC.md` have lowercase copies in the vault folder (`readme.md`, `setup.md`, `guide.md`, `iphone-guide.md`, `teach.md`, `stash-v2-spec.md`). Edit one → copy to the other so they stay identical. The vault's `stash.md` is the project hub note — update its status when a phase ships.
4. **Phone-first.** New workflows are designed for the mobile app first; the admin site is for bulk work (imports, sheet printing).
5. **Deploying** needs SSH to Unraid (`ssh unraid`). If auto mode blocks remote writes, give James the exact commands rather than working around the block.

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
Code lives at `/mnt/user/appdata/stash/repo`; Postgres data at `/mnt/cache/appdata/stash/postgres` (direct NVMe, `POSTGRES_DATA_PATH`); files at `/mnt/user/appdata/stash/{images,qrcodes,exports,floorplans}` (`DATA_PATH`). Deploy loop:
```bash
ssh unraid
cd /mnt/user/appdata/stash/repo && git -c safe.directory=/mnt/user/appdata/stash/repo pull --ff-only
docker exec stash-postgres pg_dump -U stash -d stash -Fc > /mnt/user/appdata/stash/backups/stash-$(date +%Y%m%d-%H%M).dump
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-deps stash-backend stash-admin
docker exec -w /app/packages/backend stash-backend npx prisma@6.19.3 migrate deploy   # only if schema changed
```

## Architecture

### Workspace layout
Four npm workspaces under `packages/`:
- `shared` — pure-TS types, enums, constants, and formatting utils. **Consumed by all other packages via `@stash/shared`.** Must be rebuilt (`npm run build:shared`) before backend/admin will typecheck against new changes.
- `backend` — Express + Prisma API. Entry `src/index.ts` mounts routers from `src/routes/*`; every router except `auth` applies `requireAuth` at the top.
- `admin` — React 18 + Vite SPA. Routes in `src/App.tsx`, all app pages behind `<ProtectedRoute>` + `<Layout>`.
- `mobile` — React Native 0.86 + Expo SDK 57 (React 19.2), runs in **Expo Go**. Entry `index.js` → `App.tsx`; screens in `src/screens`. No offline mode (WatermelonDB was removed in v1.1.1). Default API URL is `https://stash-api.shottsserver.com/api` (`src/lib/api.ts`). Expo Go only runs the newest SDK — after a long gap, upgrade with `npx expo install expo@^<latest>` + `npx expo install --fix`, and smoke-test with `npx expo export --platform ios` (no phone needed).

### Data model (see `packages/backend/prisma/schema.prisma`)
- **Item** is the central entity. An Item with `isContainer=true` has a companion **Container** row (1:1 via `Container.itemId`) that carries internal dimensions and container type. This dual-table pattern means "a container is just an item with extra geometry" — code that operates on items may also need to handle the container side.
- **ItemPlacement** is the history of which item sits in which container. `placedAt`/`removedAt` make it a temporal log — do not delete rows, set `removedAt` instead.
- **Item.deletedAt** is the soft-delete marker. All list queries filter `{ deletedAt: null }`; sync endpoints use `deletedAt != null` to send deletions to mobile.
- **Container.label** is the auto-generated unique container code in the format `{PREFIX}-{NNNN}` (`T27-0012`, `BXS-0001`, `UBX-0001`). It's immutable; sorting + lookup use it. (QR codes currently encode `${BACKEND_URL}/api/{items|containers}/<uuid>`, not the code. v2 replaces the code with a plain `Container.number` and QR URLs like `/c/12` — see `SPEC.md`.) Friendly text lives on the associated `Item.description` (e.g., "Tote #12 — Halloween decorations · Red lid"). The helper `services/container-codes.ts` exposes `nextContainerCode(tx, type, preferredNumber?)` (used by container creation routes) and `parseLegacyLabel()` (used by CSV import to recognize old-style labels like `Tote #12`, `Book Box #1`, `Large Tote #01`).
- **BookDetails** is a second sidecar — 1:1 with `Item` via `BookDetails.itemId`. Same dual-table reasoning as `Container`: a book is still an Item with a fate / room / photo / placement, plus bibliographic data (ISBN, edition, binding, cover URL) that doesn't apply to non-books. **No in-app AI** — the bulk pipeline is: photos → free chat UI (Claude.ai / ChatGPT) → text list → `scripts/enrich-books.mjs` (OpenLibrary + Google Books, free) → CSV → `POST /api/books/import-csv`. See `GUIDE.md` "Bulk Cataloging Books" and `BUILD_LOG.md` Chapter 21 for the full design rationale.
- **Location** (v1) is a flat list with two `LocationType`s: `ORIGIN` (Eagle Mountain, UT — the *previous* house, now stale) and `DESTINATION` (NC placeholders, back-burnered). v2 turns it into a tree (`parentId`: Place › Area › Spot) for the Blue Flax house and storage unit — see `SPEC.md`. Items carry both `originLocationId` (required) and `destinationLocationId` (optional, for move planning).
- **Fate** enum (KEEP/SELL/DONATE/TRASH/UNDECIDED) drives most of the UI's filtering and export grouping.
- Prisma uses `@@map` to snake_case every table name. When writing raw SQL or reading `pg_dump`, tables are `items`, `item_placements`, `activity_logs`, etc.
- **Mobile package monorepo gotchas:** Expo + npm workspaces requires three things that wouldn't exist in a standalone Expo project — `babel-preset-expo` listed in the **root** `package.json` devDependencies (so it hoists where `@babel/core` can find it), `packages/mobile/index.js` with explicit `registerRootComponent(App)` (Expo SDK 50+ no longer auto-registers from `"main": "App.tsx"`), and `packages/mobile/metro.config.js` that pins `react`/`react-native`/`scheduler` to mobile's own `node_modules` via `resolveRequest` (otherwise admin's hoisted React 18 collides with mobile's React 19 → `Invalid hook call`). **Keep `disableHierarchicalLookup: false`** — SDK 57 nests `expo-modules-core` under `expo/node_modules` and Metro can't find it otherwise. `@expo/ngrok` is a mobile devDependency because Expo's global lookup fails on Windows. `--tunnel` also requires `npx expo login` + the same account signed in on Expo Go. Full background: BUILD_LOG ch. 23–24.

### Backend request pipeline
1. `src/index.ts` — CORS, JSON body (10 MB limit), static mounts (`/api/files/*` serves `DATA_PATH`, `/api/public/*` serves `packages/backend/public`), then all routers.
2. Each router in `src/routes/*` calls `router.use(requireAuth)` at the top. `requireAuth` (in `src/middleware/auth.ts`) verifies the Bearer JWT and attaches `{ userId, role }` to `req.user`. `requireAdmin` must come **after** `requireAuth`.
3. Request bodies are validated through `src/middleware/validate.ts` + Zod schemas in `src/validators/*`.
4. DB access goes through the singleton `prisma` in `src/lib/prisma.ts`. Business logic that spans multiple tables lives in `src/services/*` (pricing via Claude API, QR generation, PDF export, CSV import).
5. File uploads use `multer` with disk storage under `DATA_PATH` (set to `./data` locally, `/mnt/user/appdata/stash` in prod). Photos, QR PNGs, exports, and floorplans are all on disk; only the relative path is stored in Postgres.

### Mobile sync (legacy, unused)
`routes/sync.ts` and the mobile `SyncContext` / `SyncIndicator` are leftovers from the removed WatermelonDB work; the current app doesn't depend on them. `POST /api/sync/pull` implements WatermelonDB's pull protocol. It returns `{ changes: { items: {created, updated, deleted}, ... }, timestamp }`. First sync is detected by `lastPulledAt == null` and returns everything as "created". Soft-deleted items are reported via the `deleted` bucket.

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
- **Soft-delete today** — current code sets `deletedAt` and all list queries filter on it; don't hard-delete ad hoc. (v2 Phase 4 deliberately adds a hard delete for Sold/Disposed items — ADR-006 — implement it there, with confirmation.)
- **Static file URLs** are served from `/api/files/<subdir>/<file>`, not from the admin's origin. Paths in the DB (`photoPath`, `qrCodePath`) are stored relative to `DATA_PATH`.
- **Two compose files are always used together** in dev: `-f docker-compose.yml -f docker-compose.dev.yml`. The base file alone is production-shaped (no port for postgres, no bind mounts).
