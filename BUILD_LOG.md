# BUILD_LOG.md — How Stash Got Built, Step by Step

A chronological build log. Each chapter covers one version (one
commit — or a cluster of closely related commits — in the project's
git history) and walks through what we built, the decisions we made,
the syntax and patterns we used, and any bugs we hit along the way.

**Audience:** someone with little or no experience who wants to learn
how a real software project actually comes together. Read top to
bottom — each chapter assumes you've read the ones before it.

**Companion documents:**
- [`LEARN.md`](LEARN.md) — topical reference ("here's how to think about X").
- [`TEACH.md`](TEACH.md) — deep per-step tutorial content written during
  the original build. BUILD_LOG is the shorter narrative map over the
  same journey; when you want a section unpacked, TEACH.md is the next
  stop.

> **About this backfill.** Chapters 0–18 were written **after** the
> fact, from the git history, `CHANGELOG.md`, and the source tree. The
> "The ask" and "The plan" sections reconstruct what the original
> request probably looked like based on commit messages and code
> — they are educated paraphrases, not verbatim transcripts. From
> Chapter 19 onward, the log is written in real time.

---

## How to read this

1. **Read sequentially.** Skipping chapters means missing context.
2. **Open the files alongside.** Path references are real — open them
   in your editor while you read.
3. **Try the commands yourself.** Code blocks marked `bash` are
   commands you can run.
4. **It's OK to not understand everything on first pass.** The
   topical unpacking lives in `LEARN.md` and `TEACH.md`.
5. **Glossary at the end.** Anytime a term appears in **bold italic**,
   it's defined in the glossary.

---

## Table of contents

- [Chapter 0 — Before any code: the moving-box problem](#chapter-0--before-any-code-the-moving-box-problem)
- [Chapter 1 — v0.1.0: Monorepo scaffolding](#chapter-1--v010-monorepo-scaffolding)
- [Chapter 2 — v0.2.0: The database, designed in one file](#chapter-2--v020-the-database-designed-in-one-file)
- [Chapter 3 — v0.3.0: Giving the server a voice (REST + JWT + Zod)](#chapter-3--v030-giving-the-server-a-voice-rest--jwt--zod)
- [Chapter 4 — v0.4.0: Photos on disk, QR codes in bytes](#chapter-4--v040-photos-on-disk-qr-codes-in-bytes)
- [Chapter 5 — v0.5.0: A dashboard to see it all](#chapter-5--v050-a-dashboard-to-see-it-all)
- [Chapter 6 — v0.6.0: Asking Claude "what's this worth?"](#chapter-6--v060-asking-claude-whats-this-worth)
- [Chapter 7 — v0.7.0: A phone in every pocket](#chapter-7--v070-a-phone-in-every-pocket)
- [Chapter 8 — v0.8.0: Offline-first with WatermelonDB](#chapter-8--v080-offline-first-with-watermelondb)
- [Chapter 9 — v0.9.0: Seeing the box in 3D](#chapter-9--v090-seeing-the-box-in-3d)
- [Chapter 10 — v0.10.0: Paper is forever (PDF + CSV export)](#chapter-10--v0100-paper-is-forever-pdf--csv-export)
- [Chapter 11 — v0.11.0: Bulk data in (CSV import wizard)](#chapter-11--v0110-bulk-data-in-csv-import-wizard)
- [Chapter 12 — v0.12.0: The floor plan view](#chapter-12--v0120-the-floor-plan-view)
- [Chapter 13 — v0.13.0: Users and safety guards](#chapter-13--v0130-users-and-safety-guards)
- [Chapter 14 — v0.14.0: Polish — the last 10% is 90% of the work](#chapter-14--v0140-polish--the-last-10-is-90-of-the-work)
- [Chapter 15 — v1.0.0: Shipping to Unraid](#chapter-15--v100-shipping-to-unraid)
- [Chapter 16 — v1.0.1: Lessons from the first real build](#chapter-16--v101-lessons-from-the-first-real-build)
- [Chapter 17 — v1.1.0: A 3D viewer you can actually play with](#chapter-17--v110-a-3d-viewer-you-can-actually-play-with)
- [Chapter 18 — v1.1.1: Expo Go takes its native modules back](#chapter-18--v111-expo-go-takes-its-native-modules-back)
- [Chapter 19 — v1.2.0: Cleaning the seed and untangling the data path](#chapter-19--v120-cleaning-the-seed-and-untangling-the-data-path)
- [Chapter 20 — v1.2.0: A book is just an item with a sidecar](#chapter-20--v120-a-book-is-just-an-item-with-a-sidecar)
- [Chapter 21 — v1.2.0: The bulk path wins](#chapter-21--v120-the-bulk-path-wins)
- [Chapter 22 — v1.2.1: Container codes and the great intake-CSV import](#chapter-22--v121-container-codes-and-the-great-intake-csv-import)
- [Chapter 23 — v1.2.2: Getting Stash onto the iPhones](#chapter-23--v122-getting-stash-onto-the-iphones)
- [Glossary](#glossary)

---

# Chapter 0 — Before any code: the moving-box problem

## The ask

Stash exists to answer one question: **"Where is this thing?"**

The concrete scenario driving the project: a household move from
Eagle Mountain, UT to a new property in North Carolina. Cross-country
moves generate a specific kind of anxiety — you've packed a box, you
know *something* important is in it, you don't know which box. You
also need to decide, for each object, whether it's worth moving at
all: Keep, Sell, Donate, or Trash (**KSDT**).

The off-the-shelf options — spreadsheets, note apps, generic
inventory SaaS — got each part of this wrong in a different way:

- Spreadsheets don't do photos, and a text row for "that weird lamp"
  is nearly useless six weeks later.
- SaaS inventory tools want you to scan barcodes on products you
  purchased new. Household stuff doesn't have barcodes.
- Nothing understood **containers** — a U-Box is itself an item you
  own, but also a thing other items go *inside*.

## What's the actual problem

Two problems wearing a trenchcoat:

1. **Before the move**: triage. Go room by room, decide each item's
   fate, price the sell pile, make lists for donation and trash.
2. **During and after the move**: placement. Every item gets put in
   a container; every container gets a label; on the other end, you
   unpack and confirm each item landed in its destination room.

After the move, the inventory doesn't go away — it becomes a
**permanent property inventory**. Useful for insurance, for the next
move, for "did we actually keep that thing?"

## Researching prior art

- **Sortly / Itemtopia** — pretty, mobile-first, but require a
  monthly subscription and store your data on their servers.
- **Google Sheets** — infinitely flexible, zero structure; no photos
  without a plugin, no relationships.
- **Notion** — databases plus photos, but sluggish for hundreds of
  rows and no offline on mobile.

The verdict: build a small, self-hosted app that runs on the home
server already in the house (an Unraid box named **ShottsServer**),
exposes a web admin for desk work and a mobile app for
photo-on-the-fly, and stores everything in a real database we
control.

## The design that fell out

**Stack:**

| Layer     | Choice                                    | Why |
|-----------|-------------------------------------------|-----|
| Storage   | PostgreSQL 16                             | Strong typing, relations, JSON when needed, mature |
| ORM       | Prisma                                    | Single schema file → SQL + types + client |
| Backend   | Node 20 + Express + Zod                   | Small surface, easy to reason about |
| Admin     | React 18 + Vite                           | Fast dev server, no framework overhead |
| Mobile    | React Native + Expo (SDK 54)              | Share `@stash/shared` types with admin |
| Deploy    | Docker Compose on Unraid                  | Home-server-friendly, declarative |
| Remote    | Tailscale                                 | Phones on the road still reach the server |
| LLM       | Claude API (for price estimates on Sell)  | One non-obvious power feature |
| 3D        | Three.js                                  | "Will this fit in the U-Box?" is a real question |

**Three architectural decisions that will shape everything:**

1. **Monorepo with npm workspaces.** `@stash/shared` holds types,
   enums, and constants used by backend, admin, and mobile. One source
   of truth for `Fate`, `ContainerType`, fate colors, default box
   sizes.
2. **Containers are Items.** A U-Box is not a separate model — it's
   an `Item` with `isContainer=true` plus a companion `Container` row
   holding internal dimensions. This means a container can be tracked
   (photographed, labeled, given a fate) exactly like any other
   object.
3. **Soft delete everywhere.** Items are never hard-deleted.
   `deletedAt` is the tombstone. This matters for the mobile app's
   offline sync (you need to tell the phone the item was deleted),
   for the audit log, and for "oops, undelete that."

## Chapter takeaways

- The real problem wasn't "track objects" — it was **"decide KSDT +
  place items in containers + find them again later."** Picking the
  right problem is the first design decision.
- A monorepo is the right call when three packages share vocabulary.
  Prematurely monorepo-ing three unrelated things is a mistake; here,
  every package imports from `@stash/shared` on day one.
- Home-server self-hosting is a deployment choice with design
  consequences — no public URL, so you need a VPN (Tailscale) and a
  way to expose the API to phones on LTE.

---

# Chapter 1 — v0.1.0: Monorepo scaffolding

> 📌 **What this chapter teaches.** npm **_workspaces_**, TypeScript
> project references, Docker Compose layering (base + dev + prod),
> what each of the four packages exists to do.

**Commit:** `078e70b` — "Step 1: Project scaffolding — monorepo
structure, shared types, backend/admin/mobile packages"

## The ask

Get the skeleton in place so feature work can start the next day.
Four packages, one lockfile, Docker-first dev, config that works
identically on the dev laptop and on the Unraid home server.

## The plan

- Root `package.json` with `workspaces: ["packages/shared",
  "packages/backend", "packages/admin", "packages/mobile"]`.
- Each package has its own `package.json` and `tsconfig.json`.
- `tsconfig.base.json` at the root for shared compiler options;
  package configs `extends` it.
- Three Docker Compose files:
  - `docker-compose.yml` — the base, production-shaped.
  - `docker-compose.dev.yml` — overrides for local dev (port maps,
    bind mounts, dev Dockerfile stages).
  - `docker-compose.prod.yml` — overrides for Unraid (production
    volumes, no bind mounts).
- A dev-data directory convention: `DATA_PATH=./data` locally,
  `DATA_PATH=/mnt/user/appdata/stash` on Unraid. Every file path in
  code is relative to `DATA_PATH`.

## Step 1: The four packages

```
packages/
├── shared/    # TS types + enums + constants (fate colors, default box sizes)
├── backend/   # Express + Prisma server
├── admin/     # React + Vite SPA
└── mobile/    # React Native + Expo app
```

Only **shared** has no runtime dependencies — it compiles to plain
JS and `.d.ts` files. Everything else imports from it via
`@stash/shared` (the `"name"` field in `packages/shared/package.json`).

**Why workspaces and not a lerna/nx/turbo setup?** npm workspaces are
built in, have no extra config, and we have four packages — not
forty. The moment we need shared build caching or task graphs we can
layer something on top.

## Step 2: Docker Compose layering

The three-file pattern is important enough to call out explicitly.
The base file is **production-shaped**:

```yaml
# docker-compose.yml (base)
services:
  stash-postgres:
    image: postgres:16
    # …no ports exposed to host — only inside the stash_network
  stash-backend:
    build: {context: ., dockerfile: packages/backend/Dockerfile}
    ports: ["${BACKEND_PORT:-3001}:3001"]
  stash-admin:
    build: {context: ., dockerfile: packages/admin/Dockerfile}
    # …no ports exposed; prod adds them
```

Dev and prod then **override** only what changes:

- Dev exposes postgres on `5434:5432` so Prisma can run from the host.
- Dev targets the `development` build stage of each Dockerfile (hot
  reload).
- Dev bind-mounts `packages/*/src` into the container.

**Why base-shaped-like-prod?** Because prod is the destination. Dev
is the detour. If you make base dev-shaped you end up with scary
prod-only config that only appears in one file.

## Step 3: The TS config

`tsconfig.base.json` is thirty lines of conservative settings:
`strict: true`, `target: ES2022`, `module: commonjs`,
`esModuleInterop`, `skipLibCheck`. Package configs extend it and add
`rootDir` / `outDir`.

The admin package **doesn't** extend the base — it has its own
Vite-compatible config (`module: ESNext`, React JSX). The base fits
Node packages; forcing React into `commonjs` would break Vite.

## Chapter takeaways

- Start with the deployment target's shape, not the dev environment's.
- `@stash/shared` is the spine of the monorepo. Any type or constant
  used by two of backend/admin/mobile belongs there.
- TS project configs are a tree: one base, four package configs
  extending (or intentionally not extending) it.

---

# Chapter 2 — v0.2.0: The database, designed in one file

> 📌 **What this chapter teaches.** Prisma **_schema_** syntax,
> **_enums_**, one-to-many and one-to-one relations, indexes, soft
> deletes via `deletedAt`, the **Item is also a Container** pattern.

**Commit:** `daebc19` — "Step 2: Prisma schema, seed script, and
documentation"

## The ask

Before any routes exist, model the domain end-to-end. Every table we
need, every relation, every enum — all in one file so we can see
them together.

## The plan

Seven models:
- `User` — login + audit trail authorship.
- `Location` — rooms, tagged as `ORIGIN` or `DESTINATION`.
- `Category` — Furniture, Electronics, Kitchen, etc.
- `Item` — the central entity. Has a `Fate`, dimensions, condition,
  photo path.
- `Container` — a companion row for items that *hold* other items.
  1:1 with `Item` via `itemId`.
- `ItemPlacement` — temporal log of which item is in which container,
  with `placedAt`/`removedAt`.
- `ActivityLog` — who changed what, when.

Plus six enums: `Role`, `Condition`, `Fate`, `ShapeType`,
`ContainerType`, `LocationType`.

## Step 1: The Item / Container split

The defining decision. A U-Box is, conceptually, two things: a *thing
you own* (with a fate, a photo, a location) and a *bucket other things
go into* (with internal dimensions). We could cram all that into one
model; instead:

```prisma
model Item {
  id          String  @id @default(uuid())
  // …all the "thing you own" fields…
  isContainer Boolean @default(false)
  container   Container?  // 1:1 back-relation
}

model Container {
  id     String @id @default(uuid())
  itemId String @unique        // the 1:1
  internalLengthIn Float
  internalWidthIn  Float
  internalHeightIn Float
  item   Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

**Why two tables instead of nullable columns on Item?** Nullable
columns would mean `Item` has `internalLengthIn: Float?` everywhere —
and every query returning items would waste bytes on fields that are
null 90% of the time. Splitting also enforces the invariant that a
container has inner dimensions *at all* (they are non-nullable in
`Container`).

The cost: any write that creates a container does two inserts; we
wrap those in a **_transaction_** (see Chapter 3).

## Step 2: Soft delete

```prisma
model Item {
  // …
  deletedAt DateTime?
  @@index([deletedAt])
}
```

`deletedAt: null` means alive. Every list query must filter
`{ deletedAt: null }`. Restores are trivial. The mobile sync
endpoint (Chapter 8) reports soft-deleted items as `deleted` so the
phone can remove them locally.

**Alternative considered:** a hard delete with a separate `deleted_items`
table. Rejected: twice the tables, harder to undelete, and Prisma
can't express "this foreign key might point at the archive."

## Step 3: Indexes

Prisma auto-indexes `@id` and `@unique` columns. Everything else
that's filtered or sorted on gets an explicit `@@index`:

```prisma
@@index([categoryId])
@@index([originLocationId])
@@index([destinationLocationId])
@@index([fate])
@@index([deletedAt])
```

No `@@index([createdAt])` yet — the default sort is `createdAt desc`
but the table is small enough that a sequential scan is fine. If the
item table ever exceeds ~100k rows we revisit.

## Step 4: Seed data

`prisma/seed.ts` creates realistic dev data: 2 users (james + savanah),
13 locations (origin rooms + destination rooms), 10 categories, 22
items, 3 containers, 4 placements. Running `prisma db seed` is the
fastest way to get the admin dashboard looking like something real.

The seed script uses `upsert` where possible so re-running it is
idempotent.

## Bugs we hit

None on this commit — Prisma was happy with the schema on first
compile. The first real build errors come in Chapter 16.

## Verifying

```bash
cd packages/backend
DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" \
  npx prisma migrate dev --name init
DATABASE_URL="…" npx prisma db seed
DATABASE_URL="…" npx prisma studio   # http://localhost:5555
```

## Chapter takeaways

- Design the whole data model before any routes. The schema is the
  contract the rest of the system is built on top of.
- **Items-as-Containers** is the kind of invariant that would be a
  pain to retrofit. Get it right in Chapter 2.
- `deletedAt: DateTime?` is one line of schema and saves the mobile
  sync protocol from needing a separate tombstone table.
- Always index the columns you filter on. Always. `@@index([fate])`
  costs nothing at insert time and makes fate-filtered list queries
  fly.

---

# Chapter 3 — v0.3.0: Giving the server a voice (REST + JWT + Zod)

> 📌 **What this chapter teaches.** Express **_Router_**, middleware
> pipeline, JWT **_auth_** flow, Zod **_schema validation_**,
> referential integrity guards, HTTP status codes as contract.

**Commit:** `3721c42` — "Step 3: Backend API routes — REST endpoints,
JWT auth, Zod validation"

## The ask

Turn the schema into an HTTP API. Eight resource groups (auth, items,
containers, locations, categories, placements, activity, stats).
Everything behind authentication. Every mutating endpoint validated.

## The plan

- One `Router` per resource in `src/routes/*.ts`.
- `src/index.ts` mounts them under `/api/<resource>`.
- All routers (except `auth`) call `router.use(requireAuth)` at the
  top — authentication is not opt-in.
- Zod validators live in `src/validators/*.ts`. A generic
  `validate(schema)` middleware runs them.
- The Prisma client is a singleton exported from `src/lib/prisma.ts`.

## Step 1: Auth middleware

```ts
// packages/backend/src/middleware/auth.ts
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '…' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, config.jwtSecret) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

`requireAdmin` must come **after** `requireAuth` — it reads
`req.user.role`. Middleware order is API contract.

**Why JWT and not sessions?** Mobile. The React Native app stores the
token in `expo-secure-store` and sends it on every request. A
cookie-based session would require RN cookie plumbing that Expo
doesn't love.

## Step 2: Validation middleware

```ts
// src/middleware/validate.ts
export const validate = (schema: ZodSchema) =>
  (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.flatten() });
    }
    req.body = result.data;   // ← important: replace with the parsed value
    next();
  };
```

Replacing `req.body` with `result.data` matters because Zod **coerces
and strips**. If a field is `.default(1)`, Zod fills it in; if the
client sends unknown keys, Zod drops them. You want the parsed copy.

## Step 3: The item list endpoint, as a template

Every route follows the same rhythm: parse query, build `where`
object, query Prisma, respond.

```ts
router.get('/', async (req, res) => {
  const { fate, categoryId, search } = req.query;
  const where: Record<string, unknown> = { deletedAt: null };

  if (fate) where.fate = fate;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { notes:       { contains: search, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    include: { category: true, originLocation: true, /* … */ },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});
```

The `deletedAt: null` filter appears on every list query. If you ever
see a list query that doesn't filter it, that's a bug.

## Step 4: Referential integrity

Locations and categories have item counts. Deleting one while items
still reference it would orphan them. Rather than rely on Postgres to
scream at us, we check explicitly and return a clean 409:

```ts
const itemCount = await prisma.item.count({
  where: { categoryId: id, deletedAt: null },
});
if (itemCount > 0) {
  return res.status(409).json({
    error: `Cannot delete — ${itemCount} items reference this category.`,
  });
}
```

**409 Conflict** is the right status code here — the request is
well-formed, the server understood it, but the current state forbids
it. Save 400 for "your input was garbage."

## Step 5: Transactional container creation

Creating a container is two inserts: the `Item` row plus the
`Container` row. If the second fails, the first must be rolled back.

```ts
const { item, container } = await prisma.$transaction(async (tx) => {
  const item = await tx.item.create({ data: { …, isContainer: true } });
  const container = await tx.container.create({
    data: { itemId: item.id, …dims },
  });
  return { item, container };
});
```

Prisma's `$transaction` with a callback gives you a transactional
client — anything that throws inside rolls everything back.

## Step 6: Global error handler

```ts
// src/index.ts (tail)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});
```

In dev you get the error text so you can fix it. In prod you get
"Internal server error" so you don't leak stack traces to users.

## Verifying

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"james@stash.local","password":"password123"}'
# → { "token": "eyJ…", "user": { … } }

curl http://localhost:3001/api/items -H "Authorization: Bearer <token>"
```

## Chapter takeaways

- Apply `requireAuth` at the top of each router. Auth is not per-route;
  it's a blanket default with `auth` itself as the only exception.
- Replace `req.body` with the Zod-parsed value so defaults and coerced
  types reach your handler.
- Use `$transaction` any time two writes must succeed or fail together.
- Use HTTP status codes as part of the contract: 400 bad input,
  401 unauthenticated, 403 authenticated-but-forbidden, 404 not found,
  409 state conflict. Don't just spray 500s.

---

# Chapter 4 — v0.4.0: Photos on disk, QR codes in bytes

> 📌 **What this chapter teaches.** `multipart/form-data`, **_Multer_**
> disk storage, MIME filtering, static file serving, the `qrcode`
> library, error correction levels.

**Commit:** `39fcbc1` — "Step 4: Image upload and QR code generation"

## The ask

Items need photos. Containers need scannable labels. Serve both as
static files from the same `DATA_PATH` we already configured.

## The plan

- Multer middleware for photo uploads, max 10 MB, filter to
  JPEG/PNG/WebP/HEIC.
- `qrcode` library for QR generation — both as PNG on disk (for PDF
  label sheets) and as base64 data URLs (for inline in admin UI).
- Photos live under `DATA_PATH/images`, QR codes under
  `DATA_PATH/qrcodes`, served at `/api/files/images/*` and
  `/api/files/qrcodes/*`.

## Step 1: Multer setup

```ts
// src/middleware/upload.ts
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.imagesPath),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|png|webp|heic/.test(file.mimetype);
    cb(ok ? null : new Error('Unsupported image type'), ok);
  },
});
```

Timestamp-prefixed UUID filenames give us:
- Human-scannable ordering in the file manager.
- No collisions even with concurrent uploads.
- No information leak from the original filename.

## Step 2: Static serving

```ts
// src/index.ts
app.use('/api/files', express.static(path.resolve(config.dataPath)));
```

Note `/api/files`, not `/files` — keeping everything under `/api/*`
means nginx can proxy the backend with a single `location /api/`
block in production (Chapter 15).

## Step 3: QR code generation

```ts
// src/services/qrcode.ts
export async function generateQRForItem(itemId: string) {
  const url = `${config.backendUrl}/api/items/${itemId}`;
  const filePath = path.join(config.qrCodesPath, `item-${itemId}.png`);
  await QRCode.toFile(filePath, url, {
    width: 300,
    errorCorrectionLevel: 'M',
  });
  return filePath;
}
```

`errorCorrectionLevel: 'M'` (medium, ~15%) is the sweet spot — H is
nice if you expect the label to be partially scuffed in a dusty
garage, but the dense pattern is harder to print at small sizes.

QR payload is the API URL, not a custom scheme. Scanning in a
generic QR app opens `/api/items/xxx` in the browser; scanning in
the mobile app (Chapter 7) parses the item ID out of the URL and
navigates directly.

## Chapter takeaways

- Multer's `diskStorage` + `fileFilter` + `limits` is three small
  pieces doing the boring part of file uploads.
- Timestamp-UUID filenames are a cheap, correct default.
- Encode URLs in QR codes. Generic scanners just work; your app
  still parses the ID.

---

# Chapter 5 — v0.5.0: A dashboard to see it all

> 📌 **What this chapter teaches.** React 18 function components,
> `useState`/`useEffect`, **_React Router_** nested routes,
> context-based auth, Vite's dev proxy, URL params as UI state.

**Commit:** `5fe8b2f` — "Step 5: Admin dashboard frontend — React
SPA with full CRUD UI"

## The ask

A browser-based admin dashboard. Every REST endpoint has a UI.
Sidebar navigation. Protected routes. No alert dialogs (Chapter 14
replaces the last of them).

## The plan

- Single `api.ts` client with JWT token management.
- `AuthContext` in localStorage; auto-validates on mount.
- `ProtectedRoute` wrapper redirects to `/login` when no token.
- Nested routes: one top-level `<Layout>` outlet, all authenticated
  pages as children.
- CSS from scratch. No Tailwind, no component library — the admin
  UI is small enough that custom CSS is faster to ship than wiring a
  framework.

## Step 1: The API client

```ts
// src/lib/api.ts
const API_BASE = '/api';

function getToken() { return localStorage.getItem('stash_token'); }

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opts.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export const api = {
  items:      { list: (q?: string) => request<Item[]>(`/items${q ?? ''}`), … },
  containers: { … },
  // etc.
};
```

One function (`request`) does the token/header/error boilerplate.
Every resource is a thin namespace on top.

## Step 2: Auth context

```tsx
// src/context/AuthContext.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('stash_token');
    if (!token) { setLoading(false); return; }
    api.auth.me().then(setUser).catch(() => {
      localStorage.removeItem('stash_token');
    }).finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {loading ? <Spinner/> : children}
    </AuthContext.Provider>
  );
}
```

On mount we try the stored token. If `/auth/me` rejects, we nuke the
token and land on `/login`. The `loading` state prevents a flash of
"you are logged out" while we check.

## Step 3: Nested routes

```tsx
<Routes>
  <Route path="/login" element={<LoginPage/>} />
  <Route element={<ProtectedRoute><Layout/></ProtectedRoute>}>
    <Route path="/" element={<DashboardPage/>} />
    <Route path="/items" element={<ItemListPage/>} />
    <Route path="/items/:id" element={<ItemDetailPage/>} />
    {/* etc. */}
  </Route>
</Routes>
```

`<Layout>` contains the sidebar and an `<Outlet/>`. All authenticated
pages render into that outlet. The sidebar is always visible, no
per-page layout duplication.

## Step 4: URL params as UI state

The item list filter is in the URL:

```
/items?fate=SELL&categoryId=abc
```

**Why in the URL and not component state?** Sharing, bookmarking,
browser back-button. "Can you send me the Sell list?" becomes a URL,
not "click Items, click the fate dropdown, click Sell."

## Step 5: Vite dev proxy

```ts
// packages/admin/vite.config.ts
server: {
  proxy: {
    '/api': { target: `http://${process.env.BACKEND_HOST || 'localhost'}:3001` },
  },
},
```

In dev, the admin server (`:3002`) proxies `/api/*` to the backend
(`:3001`). That means the admin code can use relative URLs
(`fetch('/api/items')`) and works identically in dev and prod —
nginx will do the same proxying in production.

The `BACKEND_HOST` env var exists for Docker dev: inside the admin
container, `localhost` is the admin container itself. The backend is
reachable at `stash-backend`. `BACKEND_HOST=stash-backend` in
`docker-compose.dev.yml` fixes this — but this only landed after we
hit the bug in Chapter 17. On first commit it was hardcoded
`localhost` and broke inside Docker.

## Chapter takeaways

- One `request()` function + per-resource namespaces is enough. You
  don't need React Query for a self-hosted app with one user.
- Nested routes + `<Outlet/>` = zero layout duplication.
- URL params are the correct storage for "state the user might want
  to share or bookmark."

---

# Chapter 6 — v0.6.0: Asking Claude "what's this worth?"

> 📌 **What this chapter teaches.** The **_Anthropic SDK_**, prompt
> engineering for structured output, JSON parsing with guardrails,
> response caching, cost discipline.

**Commit:** `d235cb2` — "Step 6: Claude LLM integration — AI-powered
price estimation"

## The ask

For SELL items, suggest a realistic secondhand price and recommended
platforms (Facebook Marketplace, OfferUp, eBay, …). Don't call the
LLM on every page load.

## The plan

- `packages/backend/src/services/pricing.ts` wraps the Anthropic SDK.
- Prompt demands JSON-only output, no markdown fences.
- Results cache to four columns on `Item`: `llmPriceSuggestion`,
  `llmPriceRationale`, `llmPricePlatforms[]`, `llmPriceGeneratedAt`.
- `GET /api/items/:id/price-estimate` returns the cached row.
- `POST /api/items/:id/price-estimate` forces a refresh.
- If `ANTHROPIC_API_KEY` is unset, return **503 Service Unavailable**,
  not 500 — the feature is optional.

## Step 1: The prompt

```ts
const prompt = `You are helping someone sell household items during a
cross-country move. Based on the item details below, provide a realistic
selling price for the US secondhand market (2026).

${details}

Respond with ONLY a JSON object (no markdown, no code fences) in this exact format:
{
  "suggestedPrice": <number>,
  "rationale": "<2-3 sentences explaining the price based on condition, brand, age, and market demand>",
  "platforms": ["<best>", "<second>", "<third>"]
}

For platforms, choose from: Facebook Marketplace, OfferUp, Craigslist,
eBay, Poshmark, Mercari, Nextdoor, Consignment Shop, Garage Sale.

Be realistic — used items typically sell for 20-50% of retail, less for
commodity items, more for premium brands in good condition.`;
```

Three things this prompt does deliberately:
1. **Context framing.** "Selling during a cross-country move" makes
   the LLM prioritize fast turnover over maximum price.
2. **Format discipline.** "JSON object, no markdown, no code fences."
   Without that, Claude sometimes wraps JSON in ```` ```json ````
   fences.
3. **Closed enum for platforms.** Otherwise the model invents
   platforms like "Trove" that don't exist here.

## Step 2: Parse + validate

```ts
const textBlock = message.content.find(b => b.type === 'text');
let estimate: PriceEstimate;
try { estimate = JSON.parse(textBlock.text); }
catch { throw new Error(`Failed to parse Claude response: ${textBlock.text}`); }

if (typeof estimate.suggestedPrice !== 'number' ||
    typeof estimate.rationale     !== 'string' ||
    !Array.isArray(estimate.platforms)) {
  throw new Error('Invalid response shape from Claude');
}
```

The LLM is a data source like any other — **don't trust its output
shape, check it at the boundary.** If the parse or shape check fails,
throw and let the global error handler return a 500 with a useful
message in dev.

## Step 3: Cache on the Item row

```ts
await prisma.item.update({
  where: { id: itemId },
  data: {
    llmPriceSuggestion:  estimate.suggestedPrice,
    llmPriceRationale:   estimate.rationale,
    llmPricePlatforms:   estimate.platforms,
    llmPriceGeneratedAt: new Date(),
  },
});
```

The cache lives with the item, not in a separate table. A price
estimate is a property of the item, not a first-class entity.

**Cost sanity check:** 22 seed items × one sonnet-4-6 call each
during dev = pennies. In production, user decides when to refresh;
default is never auto-refresh.

## Chapter takeaways

- Prompt for JSON, verify the shape, cache the result. That's the
  LLM-as-a-data-source pattern in three lines.
- Service-level feature flags via env vars (`ANTHROPIC_API_KEY` →
  503 when absent) keep the app runnable without every integration
  configured.
- Cost is easy to reason about when calls are user-triggered and
  results are cached. Auto-refreshing would be a footgun.

---

# Chapter 7 — v0.7.0: A phone in every pocket

> 📌 **What this chapter teaches.** React Native vs React, **_Expo_**,
> `expo-camera`, QR scanning, **_SecureStore_**, bottom tab + nested
> stack navigation, `FlatList`.

**Commit:** `766dcb5` — "Step 7: React Native mobile app — screens,
camera, QR scanner, iPhone guide"

## The ask

A phone app for on-the-fly cataloguing: take a photo, mark fate,
scan a QR to jump to an item in the physical world.

## The plan

- Expo SDK 54. Run in **_Expo Go_** on the phone during dev — no
  Xcode/Android Studio needed.
- Three tabs: Items, Scan, Settings. Items tab has a nested stack
  (list → detail → add).
- JWT lives in `expo-secure-store` (encrypted, not AsyncStorage).
- Settings screen has a **server URL** field — the user configures
  LAN IP / Tailscale IP / proxy domain themselves.

## Step 1: Why Expo, not bare React Native

Expo gives you:
- `expo-camera`, `expo-image-picker`, `expo-secure-store`,
  `expo-status-bar` — curated, versioned together.
- OTA updates via `eas update` (deferred — not used yet).
- The Go app, which runs our code without a native build.

The tradeoff: certain native modules (WatermelonDB) don't work in Go.
We found this the hard way in Chapter 18.

## Step 2: The server URL problem

The mobile app needs to talk to the backend. There are three
addresses:
- `http://192.168.1.153:3001` (LAN IP of the Unraid box)
- `http://100.122.58.114:3001` (Tailscale IP)
- `https://stash-api.shottsserver.com` (nginx proxy)

Rather than hardcode one, the Settings screen lets the user paste the
URL and saves it to SecureStore. The API client reads it back on
every request.

## Step 3: QR scan → navigate

```ts
function onBarCodeScanned({ data }: BarCodeScanningResult) {
  // data is the QR payload — an API URL like
  // http://…/api/items/abc123
  const match = data.match(/\/api\/(items|containers)\/([a-f0-9-]+)/);
  if (!match) return;
  const [, kind, id] = match;
  navigation.navigate(kind === 'items' ? 'ItemDetail' : 'ContainerDetail', { id });
}
```

The QR payload is the same API URL the web browser would hit
(Chapter 4). The mobile app just parses the ID out.

## Chapter takeaways

- Expo is the default for "I want to ship a React Native app this
  week." You can always eject later.
- SecureStore > AsyncStorage for anything that acts as a credential.
- Let the user configure the server URL. Home-server apps run on
  many addresses depending on whether the phone is at home, on
  Tailscale, or on LTE.

---

# Chapter 8 — v0.8.0: Offline-first with WatermelonDB

> 📌 **What this chapter teaches.** Offline-first architecture,
> **_WatermelonDB_** vs raw SQLite, pull-then-push sync protocol,
> timestamps for incremental sync, denormalization for mobile reads.

**Commit:** `aebf787` — "Step 8: WatermelonDB offline-first sync —
local DB + pull/push protocol"

> **Heads-up:** this whole chapter was partially reverted in Chapter 18
> because WatermelonDB's native modules don't run in Expo Go. The
> backend endpoints and the design remain; the mobile-side code is
> currently a SecureStore stub until a custom Expo dev build is done.
> Read this chapter for the design; see Chapter 18 for the rollback.

## The ask

The phone must work in a basement with no WiFi. Changes sync when
it's online again.

## The plan

- Mirror four Prisma models (items, containers, locations,
  categories) into a local WatermelonDB schema on the phone.
- Denormalize where it hurts to join on the phone — item rows carry
  `categoryName` and `categoryColor` inline.
- `POST /api/sync/pull` returns changes since `lastPulledAt`.
- `POST /api/sync/push` applies local creates/updates/deletes to
  Postgres.
- WatermelonDB's `synchronize()` function orchestrates pull-then-push.

## Step 1: The pull protocol

```ts
// backend routes/sync.ts
router.post('/pull', async (req, res) => {
  const { lastPulledAt } = req.body;
  const since = lastPulledAt ? new Date(lastPulledAt) : new Date(0);

  const changedItems = await prisma.item.findMany({
    where: { updatedAt: { gt: since } },
    include: { category: { select: { name: true, color: true } }, /* … */ },
  });

  const active  = changedItems.filter(i => !i.deletedAt);
  const deleted = changedItems.filter(i =>  i.deletedAt);

  res.json({
    changes: {
      items: {
        created: active.filter(i => i.createdAt > since),
        updated: active.filter(i => i.createdAt <= since),
        deleted: deleted.map(i => i.id),
      },
      /* containers, locations, categories … */
    },
    timestamp: Date.now(),
  });
});
```

First sync (`lastPulledAt == null`) returns everything as `created`.
Subsequent syncs return only rows whose `updatedAt > lastPulledAt`,
split into `created` (new since last sync) vs `updated` (existed
before, changed since).

**Soft-deleted items ride in the same result set** — they're filtered
into the `deleted` array so the phone knows to remove them locally.
This is the payoff of the `deletedAt` column from Chapter 2.

## Step 2: Push with missing-record tolerance

```ts
for (const local of changes.items.updated ?? []) {
  const exists = await prisma.item.findUnique({ where: { id: local.id } });
  if (!exists) continue;   // someone else deleted it — skip silently
  await prisma.item.update({ where: { id: local.id }, data: local });
}
```

Missing records on push are common: the phone edited an item that
someone deleted on another device since last sync. The server wins —
skip, don't error.

## Chapter takeaways

- Offline-first is a protocol decision, not a library choice.
  Pull-then-push with a timestamp is the standard pattern.
- Denormalize fields the mobile UI shows in lists. Save the join for
  detail views.
- The server is the arbiter of truth. Conflict resolution = "server
  wins, skip silently."
- Don't couple your design to a specific offline DB. WatermelonDB
  didn't work out; the protocol stays valid for whatever replaces it.

---

# Chapter 9 — v0.9.0: Seeing the box in 3D

> 📌 **What this chapter teaches.** **_Three.js_** scene / camera /
> renderer trio, wireframe vs solid geometry, `MeshPhongMaterial`,
> **_OrbitControls_**, `postMessage` for cross-platform data flow.

**Commit:** `0bb9dc4` — "Step 9: Three.js 3D container visualization"

## The ask

"Will this stuff actually fit in a U-Box?" A 3D view of the container
with every item as a colored block (by fate), inside a wireframe of
the container.

## The plan

- Single standalone HTML file `packages/backend/public/container-3d.html`.
- Loads Three.js from CDN. No build step, no npm install in that
  file's lineage.
- Data arrives via `postMessage` from the parent — either an admin
  iframe or a mobile WebView.
- Backend endpoint `GET /api/containers/:id/3d` returns container
  dims + array of items with dims + fates.

**Why a standalone HTML file, not a React component?** Cross-platform.
A single renderer runs in both the admin iframe and the mobile
WebView. Zero build config on the mobile side. Zero "threejs + React
Native" frustration.

## Step 1: The Three.js trinity

```js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50, width / height, 0.1, 1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
```

Three objects, one line each. Scene is the world. Camera is where
you look from. Renderer turns scene+camera into pixels in a
`<canvas>`.

## Step 2: Wireframe container + solid items

```js
// Container wireframe
const boxGeom = new THREE.BoxGeometry(L, H, W);
const edges   = new THREE.EdgesGeometry(boxGeom);
const line    = new THREE.LineSegments(edges,
  new THREE.LineBasicMaterial({ color: 0x888888 }));
scene.add(line);

// Item blocks — one per item, colored by fate
for (const item of items) {
  const geom = new THREE.BoxGeometry(item.L, item.H, item.W);
  const mat  = new THREE.MeshPhongMaterial({
    color: FATE_COLORS[item.fate], transparent: true, opacity: 0.7,
  });
  scene.add(new THREE.Mesh(geom, mat));
}
```

`MeshPhongMaterial` needs a light; `MeshBasicMaterial` doesn't but
looks flat. Phong + one ambient + one directional light gives
convincing depth.

## Step 3: `postMessage` bridge

```js
window.addEventListener('message', (ev) => {
  if (ev.data?.type === 'container-data') renderContainer(ev.data.payload);
});
```

Admin iframe:
```tsx
iframe.contentWindow.postMessage({ type: 'container-data', payload }, '*');
```

Mobile WebView:
```tsx
<WebView
  source={{ uri: `${API}/api/public/container-3d.html` }}
  injectedJavaScript={`window.postMessage(${JSON.stringify(msg)}, '*');`}
/>
```

Same renderer, two hosts. This is the single biggest lever in the
whole project for code reuse.

## Chapter takeaways

- `scene + camera + renderer` is the whole Three.js model. Everything
  else is geometries and materials hanging off the scene.
- A standalone HTML file with a `postMessage` data contract is a
  powerful cross-platform primitive. Better than wrestling any 3D
  library into both React and React Native.
- Wireframe for the fixed container, opaque-ish solids for the items.

---

# Chapter 10 — v0.10.0: Paper is forever (PDF + CSV export)

> 📌 **What this chapter teaches.** `@react-pdf/renderer` (React for
> PDFs), server-side buffer rendering, PDF Flexbox layout, CSV
> escaping rules, authenticated blob downloads.

**Commit:** `1cda1f8` — "Step 10: PDF & CSV export — manifests, QR
labels, sell/donate lists"

## The ask

Four PDFs + a CSV:
1. **Container manifest** — what's in this box, printed and taped
   to the lid.
2. **QR label sheet** — 2-up QR labels for every container.
3. **Sell list** — all SELL items with price estimates.
4. **Donate list** — all DONATE items (for the charity receipt).
5. **Full inventory CSV** — filterable.

## Step 1: React components for PDFs

```tsx
// src/services/pdf.tsx
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40 },
  row:  { flexDirection: 'row', borderBottom: '1 solid #ccc' },
  cell: { flex: 1, padding: 6 },
});

export async function renderContainerManifest(container) {
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text>Manifest — {container.label}</Text>
        {container.items.map(item => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.cell}>{item.name}</Text>
            <Text style={styles.cell}>{item.fate}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
  return pdf(doc).toBuffer();
}
```

This is why `pdf.ts` is actually `pdf.tsx` — JSX needs the `.tsx`
extension to parse (more on that in Chapter 16).

## Step 2: Authenticated blob download

The client can't just set `window.location = '/api/export/manifest'` —
that misses the Authorization header. Instead:

```ts
async function download(path: string, filename: string) {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

Fetch with auth → blob → object URL → hidden `<a>` click → revoke.
The browser saves the file. No auth leaks, no new window.

## Step 3: CSV escaping

```ts
function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
```

Three rules, memorize them: if the value contains a comma, a quote,
or a newline, wrap it in double quotes and escape interior quotes by
doubling them. Anything less and Excel opens your file as garbage
when an item name has a comma.

## Chapter takeaways

- `@react-pdf/renderer` lets you use your React mental model to
  build PDFs. StyleSheet uses Flexbox.
- Authenticated download = fetch + blob + object URL + hidden `<a>`.
- Every CSV generator needs exactly the same 4-line escape function.

---

# Chapter 11 — v0.11.0: Bulk data in (CSV import wizard)

> 📌 **What this chapter teaches.** Two-phase import, CSV parsing
> edge cases, auto-mapping, name-to-ID resolution, wizard UIs,
> row-level error tolerance.

**Commit:** `ea85515` — "Step 11: CSV import with column mapper"

## The ask

Let someone paste in a spreadsheet of items — columns we don't
control — and import them.

## The plan

Two phases:
1. **Parse + preview.** Upload file, backend parses, returns headers
   + first 5 rows + our list of mappable fields.
2. **Map + execute.** User picks which CSV column maps to which
   Stash field. Backend batch-creates items, returning per-row
   success/error.

## Step 1: A CSV parser that handles reality

```ts
// src/services/csv-import.ts
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"' && cur === '') inQuotes = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
```

Why not use a library? Because the library choice (papaparse vs
csv-parse vs fast-csv) would rathole the import further than this
50-line parser. It handles quoted fields, escaped quotes, and
Windows `\r\n` endings — that's enough for human-produced
spreadsheets.

## Step 2: Auto-mapping

```ts
const AUTO_MAP: Record<string, keyof ImportableField> = {
  'name':        'name',
  'item name':   'name',
  'description': 'description',
  'category':    'categoryName',
  'room':        'locationName',
  /* … */
};

for (const header of csvHeaders) {
  const normalized = header.toLowerCase().trim();
  if (AUTO_MAP[normalized]) mapping[header] = AUTO_MAP[normalized];
}
```

Users see a pre-filled mapping and only adjust the weird columns.
Small thing; huge UX win.

## Step 3: Row-level error tolerance

```ts
const results = { created: 0, errors: [] as Array<{ row: number; error: string }> };
for (let i = 0; i < rows.length; i++) {
  try {
    await prisma.item.create({ data: buildItem(rows[i], mapping) });
    results.created++;
  } catch (e) {
    results.errors.push({ row: i + 2, error: (e as Error).message });
  }
}
```

One bad row doesn't abort the import. The user sees "created 847,
failed 3, here are the three rows" and can fix them and re-import.

**Row number is `i + 2`** — row 1 was the header, rows start from 2.
This matches what the user sees in Excel.

## Chapter takeaways

- Two-phase imports (preview → map → execute) give the user a chance
  to bail before committing 1000 rows.
- Auto-mapping on normalized header names covers 80% of real
  spreadsheets.
- Don't abort on the first bad row. Collect and report per-row
  errors.

---

# Chapter 12 — v0.12.0: The floor plan view

> 📌 **What this chapter teaches.** Prisma `groupBy`, stacked bar
> rendering, `v1 grid → v2 image overlay` progressive enhancement,
> CSS grid.

**Commit:** `6541799` — "Step 12: Floor plan view — room grid with
fate breakdown bars"

## The ask

Show every room with a fate bar so you can see at a glance which
rooms are done (mostly KEEP/DONATE/TRASH triaged) versus untouched
(mostly UNDECIDED).

## The plan

- `GET /api/floorplan/:house` returns rooms plus item counts per
  fate per room in one query.
- v1: CSS grid layout, rooms as cards.
- v2 (deferred): overlay room cards on an actual floor plan image
  using `floorPlanX/Y/Width/Height` (already on the `Location`
  model from Chapter 2).

## Step 1: groupBy for counts

```ts
const rooms = await prisma.location.findMany({
  where: { type: house === 'origin' ? 'ORIGIN' : 'DESTINATION' },
  orderBy: [{ floor: 'asc' }, { sortOrder: 'asc' }],
});

const counts = await prisma.item.groupBy({
  by: ['originLocationId', 'fate'],
  where: { deletedAt: null, originLocation: { type: /* … */ } },
  _count: true,
});

// Pivot: { [roomId]: { KEEP: n, SELL: n, … } }
const byRoom: Record<string, Record<Fate, number>> = {};
for (const c of counts) {
  byRoom[c.originLocationId] ??= {} as any;
  byRoom[c.originLocationId][c.fate] = c._count;
}

res.json(rooms.map(r => ({ ...r, fateCounts: byRoom[r.id] ?? {} })));
```

One query for rooms, one groupBy for counts, pivot in memory.
Alternative (N+1 count queries per room) would be much simpler code
but much more Postgres round-trips.

## Step 2: Stacked bar in CSS

```tsx
<div className="fate-bar">
  {Object.entries(room.fateCounts).map(([fate, count]) => (
    <div
      key={fate}
      className="fate-bar-segment"
      style={{
        flex: count,
        backgroundColor: FATE_COLORS[fate],
      }}
      title={`${fate}: ${count}`}
    />
  ))}
</div>
```

Flexbox with `flex: <count>` on each segment. Proportions fall out
automatically. Title attribute gives hover tooltips without extra JS.

## Chapter takeaways

- `prisma.groupBy` + pivot-in-memory beats N+1 count queries.
- Ship v1 with simple CSS; leave schema hooks (`floorPlanX/Y/Width/Height`)
  for v2. Don't delete the columns just because v1 doesn't use them.
- Flexbox `flex: <n>` gives you proportional stacked bars for free.

---

# Chapter 13 — v0.13.0: Users and safety guards

> 📌 **What this chapter teaches.** Role-based access control, the
> **_safety guard_** pattern, password reset flow, admin UI
> conventions.

**Commit:** `8a9e015` — "Step 13: Users management — admin CRUD with
safety guards"

## The ask

Admins need to add, promote, demote, delete other users. Safely.

## The plan

- `/api/users/*` behind `requireAuth + requireAdmin`.
- Password reset sets `mustChangePassword: true`; login flow
  redirects to a change-password page when that's set.
- Before any destructive write, check invariants.

## Step 1: The safety guards

```ts
router.delete('/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.userId) {
    return res.status(400).json({ error: "Can't delete yourself" });
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const victim = await prisma.user.findUnique({ where: { id: req.params.id }});
  if (victim.role === 'ADMIN' && adminCount <= 1) {
    return res.status(400).json({ error: "Can't delete the last admin" });
  }

  // Reassign victim's items to the requesting admin, then delete
  await prisma.$transaction([
    prisma.item.updateMany({
      where: { addedById: victim.id },
      data:  { addedById: req.user.userId },
    }),
    prisma.user.delete({ where: { id: victim.id } }),
  ]);
  // …
});
```

Three guards in sequence: self-delete, last-admin, item
reassignment. The reassignment happens in the same transaction as
the delete so we never have orphaned items.

**Safety guards are not errors — they're business rules.** Use 400
when the rule would be violated, not 500. Return a human-readable
message the admin UI can just display.

## Step 2: mustChangePassword

```ts
// login route
if (user.mustChangePassword) {
  return res.json({ token, user, requireChange: true });
}
```

The admin UI sees `requireChange: true` and routes to a
change-password form on first login. The form hits a dedicated
`PATCH /api/auth/password` endpoint that clears the flag.

## Chapter takeaways

- Safety guards are 400s, not 500s. The admin needs to read them.
- Reassignment-before-deletion is a transactional pattern worth
  memorizing — any "delete an owner" operation needs one.
- "First login must change password" is a two-line flag on the user
  + a check in login response. Don't over-engineer it.

---

# Chapter 14 — v0.14.0: Polish — the last 10% is 90% of the work

> 📌 **What this chapter teaches.** **_Error boundaries_** (why class
> components), toast notifications via context, responsive sidebar
> with CSS transforms, media queries, reusable components.

**Commit:** `403ed56` — "Step 14: Polish — error boundary, toasts,
responsive layout, UI components"

## The ask

Remove all remaining `alert()` calls. Make the UI usable on a phone
browser. Catch render crashes gracefully.

## The plan

- `ErrorBoundary` class component wrapping the app.
- `ToastContext` with `success/error/info` variants, auto-dismiss,
  stacking, slide-in animation.
- Sidebar collapses to a hamburger on `< 768px`.
- Extract `Spinner` and `EmptyState` so no page has to reinvent a
  loading indicator or empty-list card.

## Step 1: Why class components for error boundaries

Function components **can't** implement error boundaries. React's
error-boundary API is lifecycle methods `componentDidCatch` and
`getDerivedStateFromError`. There's no hook equivalent (2026 status:
still none). This is the one place in the app that's not a function
component.

```tsx
export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error(err, info); }
  render() {
    if (this.state.hasError) return <RecoveryCard/>;
    return this.props.children;
  }
}
```

It wraps the entire `<App>`. If any page render throws, the user
sees the recovery card with a "Go to Dashboard" button instead of a
white screen.

## Step 2: Toast pattern

```tsx
const ToastContext = createContext<{ push: (t: Toast) => void }>(null!);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Toast) => {
    const id = crypto.randomUUID();
    setToasts(ts => [...ts, { ...t, id }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <ToastOverlay toasts={toasts}/>
    </ToastContext.Provider>
  );
}
```

Any component calls `useToasts().push({ kind: 'success', text: '…' })`.
The overlay lives at the end of the provider's children so it floats
above everything. No portals needed.

## Step 3: Responsive sidebar

```css
.sidebar {
  transform: translateX(0);
  transition: transform 200ms ease;
}
@media (max-width: 767px) {
  .sidebar {
    position: fixed; inset: 0 auto 0 0; z-index: 20;
    transform: translateX(-100%);
  }
  .sidebar.open { transform: translateX(0); }
}
```

A transform+transition gives the slide animation for free. The
overlay backdrop is a sibling `<div>` with its own transition.

## Chapter takeaways

- Error boundaries are the only place you still write class
  components. Accept it, move on.
- Toasts + context + auto-dismiss + stacking = 50 lines that replace
  every `alert()` you will ever write.
- Mobile-responsive sidebar is CSS, not JS. `translateX` +
  transition is the whole pattern.

---

# Chapter 15 — v1.0.0: Shipping to Unraid

> 📌 **What this chapter teaches.** Multi-stage Docker builds,
> production nginx, body size + timeouts, bind-mount volumes, nginx
> proxy manager, deployment checklists.

**Commit:** `88ba952` — "Steps 15-16: Docker production build +
Unraid deployment — v1.0.0"

## The ask

Get this running on ShottsServer at `/mnt/user/appdata/stash/`
behind Nginx Proxy Manager, with HTTPS.

## The plan

- Multi-stage Dockerfile for each container: `deps → build → dev`
  and `deps → build → prod`.
- Admin prod image is nginx serving the built Vite bundle.
- Backend prod image is Node running the TypeScript-compiled JS.
- Nginx Proxy Manager on Unraid fronts both containers with
  Let's Encrypt certs.

## Step 1: Multi-stage Dockerfile (backend)

```dockerfile
# packages/backend/Dockerfile (simplified)
FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json   packages/shared/
COPY packages/backend/package.json  packages/backend/
RUN npm ci

FROM deps AS build
COPY packages/shared   packages/shared
COPY packages/backend  packages/backend
RUN npm run build:shared && npm run build -w packages/backend

FROM node:20-slim AS prod
WORKDIR /app
COPY --from=deps  /app/node_modules        node_modules
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/backend/dist packages/backend/dist
COPY packages/backend/prisma packages/backend/prisma
COPY packages/backend/public packages/backend/public
CMD ["node", "packages/backend/dist/index.js"]

FROM build AS development
CMD ["npm", "run", "dev", "-w", "packages/backend"]
```

- `deps` layer caches `npm ci` until a package.json changes.
- `build` layer does `tsc`.
- `prod` layer is slim — no source, no dev deps, no TypeScript.
- `development` targets get selected by the dev compose override.

## Step 2: nginx tweaks for the admin container

```nginx
server {
  listen 80;
  client_max_body_size 15m;           # photo uploads
  proxy_read_timeout   30s;           # Claude API calls

  root /usr/share/nginx/html;
  index index.html;

  # SPA fallback — React Router needs every URL to serve index.html
  location / {
    try_files $uri /index.html;
  }
}
```

- `client_max_body_size 15m` matches the backend's 10 MB upload
  limit with headroom for multipart overhead.
- `proxy_read_timeout 30s` gives the Claude pricing call enough
  time. Nginx's default 60s is actually fine; we set it explicitly
  so it's obvious.
- SPA fallback (`try_files`) means refreshing on `/items/abc123`
  serves `index.html` instead of 404ing.

## Step 3: Data persistence

```yaml
volumes:
  - ${DATA_PATH}/postgres:/var/lib/postgresql/data
  - ${DATA_PATH}/images:/app/data/images
  - ${DATA_PATH}/qrcodes:/app/data/qrcodes
  - ${DATA_PATH}/exports:/app/data/exports
  - ${DATA_PATH}/floorplans:/app/data/floorplans
```

Five volumes, all mapped to `/mnt/user/appdata/stash/*` on Unraid.
Nothing the app cares about lives inside a container.

## Chapter takeaways

- Multi-stage builds are how you get a 200 MB prod image that
  contains no source, no dev deps, no TypeScript.
- SPA + nginx = remember the `try_files $uri /index.html` line.
- All persistent state goes on the host. Containers are cattle.

---

# Chapter 16 — v1.0.1: Lessons from the first real build

> 📌 **What this chapter teaches.** The three kinds of errors you
> get on first build: missing COPY, wrong extension, wrong host.

**Commit:** `5ffe77b` — "Fix: Dockerfile tsconfig, pdf.tsx rename,
initial migration"

## The ask

None from a user. This is the "first build on a clean machine fails"
chapter.

## Bugs we hit

### Bug 1: Missing `COPY tsconfig.base.json`

**Symptom:** `tsc` inside the backend container fails with
`Cannot read file /app/tsconfig.base.json`.

**Root cause:** The package-level `tsconfig.json` does
`"extends": "../../tsconfig.base.json"`. The Dockerfile copied
`packages/backend` and `packages/shared` but not the root
`tsconfig.base.json`. Worked locally because local filesystem has
the whole repo.

**Fix:** `COPY tsconfig.base.json ./` in both backend and admin
Dockerfiles.

**Lesson:** If you `extends` a file outside the package, the Docker
build context needs to include that file.

### Bug 2: `pdf.ts` vs `pdf.tsx`

**Symptom:** `tsc` fails parsing `pdf.ts` with
`Unexpected token '<'`.

**Root cause:** `@react-pdf/renderer` uses JSX. esbuild/tsc parses
JSX only in `.tsx` files. The file extension *is* the trigger.

**Fix:** `git mv pdf.ts pdf.tsx`. Nothing else changes.

**Lesson:** JSX-bearing files end in `.tsx`. It's not a stylistic
preference, it's how the compiler knows.

### Bug 3: Prisma `DATABASE_URL` mismatch

**Symptom:** `prisma migrate dev` from the dev laptop fails
connecting to `stash-postgres:5432`.

**Root cause:** Prisma runs on the host, not in Docker. From the
host, the postgres container is reachable at `localhost:5434` (the
mapped port from `docker-compose.dev.yml`), not at its internal
hostname.

**Fix:** Prefix all Prisma host-side commands:
```bash
DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" \
  npx prisma migrate dev
```

**Lesson:** Understand who's running where. If the tool is on the
host and the service is in Docker, you need the host-side address.

## Chapter takeaways

- First-build bugs are almost always about **where files/services
  actually live** — file extensions, build contexts, network
  hostnames.
- Fix the root cause, don't paper over it. "Rename `.ts` to `.tsx`"
  is the right fix; `// @ts-ignore` would be paper.
- Document the fixes in TEACH.md — these exact three bugs will bite
  the next person setting up from scratch.

---

# Chapter 17 — v1.1.0: A 3D viewer you can actually play with

> 📌 **What this chapter teaches.** Raycasting for hover/click,
> axis-aligned bounding box (**_AABB_**) collision detection,
> stacking physics by scanning lower-Y neighbours, rotation with
> revert.

**Commits (clustered):**
- `5a05ccd` — 3D viewer v2: hover, select, drag
- `b6ed1e6` — Live shape preview on item create
- `34a97d1` — Reorder form fields
- `03a1ce8` — Rotation, collision, stacking
- `f52b415` — Utah/NC location names, Place in Container UI
- `3d074b9` — Vite proxy via BACKEND_HOST
- `ea95e07` — Docker admin port conflict
- `d231f76` — GUIDE.md
- `5714fed` — Docs update to v1.1.0

## The ask

The 3D viewer from Chapter 9 was read-only. Users want to grab
items, rearrange them, rotate. And they want a live preview on the
Add Item page so they can see the shape as they type dimensions.

## The plan

Three distinct things shipped under v1.1.0:
1. **Interactive 3D viewer** — hover tooltips, click to select, drag
   to reposition, R to rotate, collision detection, stacking.
2. **Shape preview on Add Item** — separate `shape-preview.html`
   that reacts to L/W/H/shape/fate changes in real time.
3. **Infra fixes** — Docker port conflict, Vite proxy in Docker,
   seed location names.

## Step 1: Hover + click via raycasting

```js
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  mouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(itemMeshes);
  setHovered(hits[0]?.object ?? null);
});
```

Normalized device coords `[-1, 1]` for both axes — that's what
Three.js's raycaster expects, regardless of canvas size.

## Step 2: AABB collision

```js
function overlaps(a, b, eps = 0.01) {
  return (
    a.min.x + eps < b.max.x && a.max.x - eps > b.min.x &&
    a.min.y + eps < b.max.y && a.max.y - eps > b.min.y &&
    a.min.z + eps < b.max.z && a.max.z - eps > b.min.z
  );
}
```

Six comparisons. The `eps` (epsilon) tolerance lets items *touch*
edge-to-edge without being called a collision. Without it, floating
point noise would flag every adjacency.

## Step 3: Stacking physics

```js
function findStackHeight(item, others) {
  let y = 0; // container floor
  for (const o of others) {
    if (o === item) continue;
    if (!overlapsXZ(item, o)) continue;   // no shadow beneath this item
    y = Math.max(y, o.position.y + o.height);
  }
  return y;
}
```

Scan every other item. If its XZ footprint overlaps ours, we must
sit at or above its top. Max over all such items = our Y.

This runs during drag (every mousemove), after rotate, and on
initial layout. O(n) per item; n < 50 in practice — fast enough.

## Step 4: Rotation with revert

```js
function rotateSelected() {
  const saved = { L: item.L, W: item.W };
  [item.L, item.W] = [item.W, item.L];
  rebuildGeometry(item);
  if (overlapsAny(item, others)) {
    // Revert
    [item.L, item.W] = [saved.L, saved.W];
    rebuildGeometry(item);
    flashBlocked();
  }
}
```

Swap dims, rebuild mesh, check. If blocked, swap back. "Try-and-revert"
is cheaper than "compute whether it would fit" because the collision
check already does the hard part.

## The infra fixes (not glamorous, essential)

- **`ea95e07` — Docker port conflict.** Base compose mapped
  `3002:80`, dev override mapped `3002:3002`. Docker Compose
  **merges** port arrays instead of replacing. Both bindings fought
  for host port 3002. Fix: remove ports from base, let each
  environment override add them.
- **`3d074b9` — Vite proxy host.** Admin container's Vite proxy was
  `localhost:3001`, which inside the container is the admin
  container itself. Added `BACKEND_HOST` env var defaulting to
  `localhost` for non-Docker dev, set to `stash-backend` in the dev
  override.
- **Root `.dockerignore`.** The build context was trying to include
  `data/postgres/` and failing on permissions. Exclude `data/`,
  `node_modules/`, `.git/`.

## Chapter takeaways

- Three.js raycasting is five lines of code for hover/click. Learn
  it; don't hand-roll hit detection.
- AABB with epsilon + XZ-overlap stacking = believable physics
  without a physics engine.
- Docker Compose `ports` arrays merge, they don't replace. Put
  environment-specific port maps in overrides.
- Vite's dev proxy needs to know the backend hostname, which differs
  between "local dev on host" and "local dev in Docker." Env var it.

---

# Chapter 18 — v1.1.1: Expo Go takes its native modules back

> 📌 **What this chapter teaches.** The Expo Go vs custom dev build
> trade-off, how to back out a bad library choice without destroying
> the feature around it.

**Commits (clustered):**
- `d891e6b` — Remove WatermelonDB, add placeholder assets
- `4187c9c` — Delete `src/db/`, update docs
- `6b5a1e1` — Add package-lock.json

## The ask

"The mobile app crashes on launch in Expo Go."

## Bugs we hit

### Bug: WatermelonDB native modules crash Expo Go

**Symptom:** App launches, then crashes in Expo Go with a native
module error referencing `WMDatabase` (WatermelonDB's native
bridge).

**Root cause:** WatermelonDB requires native iOS/Android modules
that are *not* in the Expo Go bundle. To use WatermelonDB you need a
**custom Expo dev build** (`eas build --profile development`). Expo
Go alone can't load it.

**Fix:** Rip out WatermelonDB from the mobile package. Keep the
backend sync endpoints (they're fine). Replace `SyncContext`'s real
sync logic with a SecureStore-based stub that just reports "idle."
Document in BACKLOG.md that full offline sync returns when we do a
custom dev build.

**Why this was a design miss:** Chapter 8 picked WatermelonDB without
verifying it runs in Expo Go. The feature (offline sync) was good;
the library choice required a toolchain we weren't ready for.

### Also: Expo Go asset requirements

Expo requires `icon.png`, `splash.png`, `adaptive-icon.png` to exist
or bundling fails. Added placeholder assets so the app builds.

## What we kept and what we threw away

| Kept | Threw away |
|------|-----------|
| Backend `/api/sync/pull` and `/api/sync/push` endpoints | WatermelonDB schema, models, sync code on mobile |
| The pull-then-push protocol design | The `synchronize()` call that used it |
| `SyncContext` (rewritten as a stub) | The "syncing" UI states it managed |

## Chapter takeaways

- **Verify library compatibility with your runtime before building
  a feature around it.** "Does this run in Expo Go?" is a 60-second
  check that would have saved this whole detour.
- When backing out a bad choice, don't nuke the feature around it.
  The sync protocol is reusable; only the client implementation
  changed.
- Write down the deferred work (BACKLOG.md) so a future you knows
  what's intentional vs what's broken.

---

# Chapter 19 — v1.2.0: Cleaning the seed and untangling the data path

> 📌 **What this chapter teaches.** Reading your homelab docs as the
> source of truth, the difference between scaffold data and fixture
> data, the Unraid **_FUSE/shfs_** trap for database containers, and
> Postgres enum migrations.

**Date:** 2026-04-24. First chapter written in real time (chapters 0–18
were a backfill from git history; see the preamble).

## The ask

Three things, said back-to-back:

1. "Remove any fake data that was added."
2. "We were supposed to be using my unraid server for the database and
   everything else we could."
3. "Ensure that there are pre-generated containers for 27-gallon HDX
   totes, 14-gallon HDX totes, the U-Haul U-Box for now."

A fourth — the AI book-scanner feature — was explicitly deferred to
the next session.

## Investigating before changing

Before touching anything I checked four things:

1. **Is anything actually running?** `docker ps` against the local box
   failed (Docker Desktop off). `ssh unraid` succeeded; `docker ps |
   grep stash` returned no rows. The appdata directories at
   `/mnt/cache/appdata/stash/{postgres,images,qrcodes,exports,floorplans,repo}`
   existed but were **empty** — created Mar 26, never used. So the
   "fake data" wasn't on any disk yet; it was only the seed script.

2. **What does the user's homelab doc say about Unraid storage?** From
   `D:/James_Journey/areas/homelab/storage-and-paths.md`:

   > Container appdata must use direct NVMe paths. Always mount appdata
   > from `/mnt/cache/appdata/` or `/mnt/data_main/appdata/` — NEVER
   > from `/mnt/user/appdata/`. The `/mnt/user/` path goes through
   > Unraid's FUSE layer (shfs), which adds catastrophic I/O overhead
   > for database-heavy containers.

   Stash's `SETUP.md` and `.env.example` both told you to do exactly
   the wrong thing — point everything at `/mnt/user/appdata/stash`.
   The Plex hub had gone 70s → 1s after a similar fix. We were lucky
   we hadn't deployed yet.

3. **What does the user actually want for destination rooms?** The
   obsidian note `stash-destination-room-list.md` had a structured
   list of 32 rooms (17 main floor + 4 basement + 7 outbuildings + 4
   property exterior) with real intent (James's Office, Savanah's
   Studio, Woodshop, Barn/Forge…) and real hex colors, but TBD
   dimensions because no NC property is under contract yet.

4. **Container types — what's missing?** `ContainerType` had
   `TOTE_27GAL` but no `TOTE_14GAL`. The 27-gal dimensions in the seed
   (`24 × 16 × 14`, 50 lbs) were also undersized for actual
   27-gallon-of-volume.

## The plan

**Phase 1 — Seed cleanup + container templates.**
- Add `TOTE_14GAL` to the `ContainerType` enum and ship a Prisma
  migration for it.
- Update `@stash/shared/constants/container-defaults.ts` with HDX-spec
  dims and rename labels to match the real products.
- Rewrite `seed.ts` to plant **only the real scaffold**: 2 user
  accounts (1 admin + 1 user, real emails), origin rooms (Eagle
  Mountain, UT — keep what's there), 32 destination rooms
  (placeholder template from obsidian), 10 category templates. **Zero
  items, containers, placements, or activity logs.**
- Strip `james@stash.local` / `password123` from every doc and the
  `LoginPage` placeholder.

**Phase 2 — Untangle the data path.**
- Split `DATA_PATH` (uploaded files; user share) from
  `POSTGRES_DATA_PATH` (DB files; cache pool).
- Update `docker-compose.yml`, `.env.example`, and the `SETUP.md`
  Unraid section.

**Phase 3 (deferred):** actual deploy + the book-scanner feature.

## Step 1: The 14-gallon enum migration

Adding an enum value in Postgres is its own little story.
`enum_add_value` requires a committed transaction before the new
value can be **used** in queries. `prisma migrate deploy` handles this
correctly because it runs migrations in their own transactions.

```sql
-- packages/backend/prisma/migrations/20260424160000_add_tote_14gal/migration.sql
ALTER TYPE "ContainerType" ADD VALUE 'TOTE_14GAL';
```

One line. Additive — no existing rows reference it, so nothing breaks.

## Step 2: Real HDX dimensions

The original 27-gal entry was `24 × 16 × 14, 50 lbs`. A real HDX
27-gallon tote (per Home Depot's spec sheet) is closer to
`28.3 × 18.5 × 13.6` internal with a 75 lb capacity. The new entry
matches the real product; it'll matter the moment the 3D fill
calculator is used.

```ts
[ContainerType.TOTE_27GAL]: {
  label: 'HDX 27-Gal Tote',
  lengthIn: 28.3, widthIn: 18.5, heightIn: 13.6,
  maxWeightLbs: 75,
},
[ContainerType.TOTE_14GAL]: {
  label: 'HDX 14-Gal Tote',
  lengthIn: 21, widthIn: 14, heightIn: 11.5,
  maxWeightLbs: 50,
},
```

Numbers are from manufacturer specs. They're the right starting
point; if they're off when measured, edit one file and re-build
shared.

## Step 3: Scaffold-only seed

The biggest mental shift in the rewrite: **distinguish scaffold from
fixture.**

- **Scaffold** is data the app is unusable without — at least one
  admin account, the rooms you're packing from, the rooms you're
  packing to, the categories you're going to tag items with.
- **Fixture** is dev-only data: a sectional sofa, a 65" Samsung TV, a
  KitchenAid stand mixer. None of it real, all of it would have to be
  manually deleted in production.

The old seed mixed both. The new one keeps only the scaffold:

```
Users:        2 (James as ADMIN, Savanah as USER)
Origin:       8 rooms (Eagle Mountain, UT)
Destination: 32 rooms (NC Property — TBD; placeholder template)
Categories:  10 (templates)
Items:        0
Containers:   0
Placements:   0
Activity:     0
```

Real emails (`jameshendershott85@gmail.com`,
`mama.shotts@gmail.com`). Initial passwords from `SEED_ADMIN_PASSWORD`
/ `SEED_USER_PASSWORD` env vars; if unset, the seed uses a
placeholder and prints a loud warning. Savanah gets
`mustChangePassword: true`; James doesn't (because there's no
self-service change-password UI yet — that's a BACKLOG item).

The destination rooms are a **template** — they encode the *concepts*
(James's Office, Savanah's Studio, Woodshop, Livestock Barn) plus
real hex colors that survive any property choice. Once a property is
under contract, you rename rooms via the Locations UI and the colors
stay valid.

## Step 4: The data-path split

`docker-compose.yml` had one volume:

```yaml
- ${DATA_PATH:-./data}/postgres:/var/lib/postgresql/data
```

If a user followed `SETUP.md` and set `DATA_PATH=/mnt/user/appdata/stash`,
Postgres data files would have landed at `/mnt/user/appdata/stash/postgres`
— the FUSE union path — and stash-postgres would have been the slowest
service in the homelab.

The fix:

```yaml
- ${POSTGRES_DATA_PATH:-./data/postgres}:/var/lib/postgresql/data
```

Local default still works (`./data/postgres`). `.env.example` documents
the prod values:

```env
DATA_PATH=/mnt/user/appdata/stash               # photos, QR, exports — fine on user share
POSTGRES_DATA_PATH=/mnt/cache/appdata/stash/postgres   # DB — direct NVMe
```

The cost: cache-pool isn't parity-protected, so `pg_dump` backups
matter more. The benefit: Postgres stops fighting shfs for every
WAL fsync.

## Verifying

- `npm run build:shared` succeeds with the new enum value.
- The new migration file is structurally identical to other Prisma
  migrations in the directory (timestamped folder, `migration.sql`).
- Searched the repo for `james@stash.local` and `password123` —
  remaining matches are in `TEACH.md` (historical teaching content)
  and earlier BUILD_LOG chapters (historical narrative). Anything
  current-tense is updated.
- Did **not** run `prisma db seed` against any database. The seed
  rewrite is verified by reading; it executes against fresh Postgres
  on the next deploy.

## Bugs we hit

None this round — every change was additive or a rename. Real bugs
will surface when we actually deploy in Phase 3.

## Chapter takeaways

- **Read the homelab docs before you write deployment docs.** The
  vault had a flashing red warning about FUSE/shfs and Postgres that
  the Stash setup doc cheerfully ignored.
- **Scaffold ≠ fixture.** Seed scripts should plant scaffold (the
  thing the app needs to be usable) and nothing else. Fixtures are a
  separate, optional step (`npm run db:seed:demo` if you want one).
- **Adding a Postgres enum value is a real migration.** Not zero-cost,
  but additive — no existing rows reference the new value.
- **Templates beat blanks.** A "TBD" destination room with the right
  hex color and the right concept is more useful than a blank list,
  because it captures intent.

---

# Chapter 20 — v1.2.0: A book is just an item with a sidecar

> 📌 **What this chapter teaches.** The **_sidecar table_** pattern,
> two-phase AI pipelines (vision + lookup), why you don't trust an LLM
> with ISBNs, picking Haiku over Sonnet on cost, fighting a
> pre-existing strict-mode debt, and Postgres enum migrations.

**Date:** 2026-04-24, same session as Chapter 19. The user has thousands
of books and was clear: the AI book scanner is the headline feature for
v1.2.

## The ask

> "Add a 'book' specific button. It asks you to take a picture of the book
> and then the AI should find the details for that book. you can review
> it to confirm but it should have the cover art, the main details
> including the ISBN number, hardback/paperback option, condition, and
> also the edition if able."

Two design questions decided up-front before writing any code:

1. **Where does book data live?** A separate `BookDetails` table 1:1 with
   `Item`, vs. a JSON blob on `Item`. We picked the table — same pattern
   as `Container`, queryable, less to regret.
2. **Which AI?** Claude Haiku 4.5 for the vision call (cost-optimal at
   ~$0.003/book), keep Sonnet 4.6 for the existing sell-price feature
   (where reasoning matters more than cost).

## The plan

A two-phase pipeline:

```
            ┌──────────────────────────────────────────┐
            │ User snaps a photo of the book cover     │
            └──────────────────┬───────────────────────┘
                               │
            ┌──────────────────▼───────────────────────┐
   Phase 1  │ Claude Haiku 4.5 — "read the cover"      │  ~$0.003
            │ Returns: title, authors, edition guess,  │
            │ binding guess, visible-ISBN if any,      │
            │ confidence score                         │
            └──────────────────┬───────────────────────┘
                               │
            ┌──────────────────▼───────────────────────┐
   Phase 2  │ OpenLibrary search → Google Books fallbk │  free
            │ Returns: canonical ISBN-10/13, publisher,│
            │ year, page count, official cover URL     │
            └──────────────────┬───────────────────────┘
                               │
            ┌──────────────────▼───────────────────────┐
            │ Transaction: create Item + BookDetails    │
            │ Activity log entry tags it as 'book'      │
            └───────────────────────────────────────────┘
```

The split matters: Claude is great at *reading what's on the cover*
(an OCR/vision task it does cheaply). It's terrible at *recalling
specific ISBN numbers* — it would hallucinate them. So we let Claude
read the photo, then we hit databases for the authoritative values.

## Step 1: The sidecar table

```prisma
model BookDetails {
  id               String      @id @default(uuid())
  itemId           String      @unique

  isbn10           String?
  isbn13           String?
  title            String
  authors          String[]
  publisher        String?
  publishedYear    Int?
  edition          String?
  pageCount        Int?
  language         String?
  binding          BookBinding @default(UNKNOWN)
  coverImageUrl    String?
  openLibraryId    String?
  googleBooksId    String?
  lookupSource     String?     // "openlibrary" | "google-books" | "claude-only" | "manual"
  lookupConfidence Float?

  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  item             Item        @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([isbn13])
  @@index([isbn10])
  @@map("book_details")
}

enum BookBinding {
  HARDBACK
  PAPERBACK
  EBOOK
  AUDIOBOOK
  BOXED_SET
  UNKNOWN
}
```

This is the same **_sidecar table_** pattern as `Container` from
Chapter 2. A book is still an `Item` with a fate, a room, a photo, a
container — that part of the world stays consistent. The book-specific
fields hang off in their own table, indexed on ISBN for fast "do we
already have this book?" lookups.

The migration is one CREATE TYPE + one CREATE TABLE + three indexes +
a foreign key. Boring, additive. Nothing existing references it.

## Step 2: Reading covers with Claude Haiku

`packages/backend/src/services/book-lookup.ts` does the vision call.
The prompt is opinionated:

```
Respond with ONLY a JSON object (no markdown, no code fences) in this
exact shape:
{
  "title": "<book title>",
  "authors": ["<author 1>", "<author 2>"],
  "edition": <"1st edition" | "Revised" | … or null>,
  "bindingGuess": "<HARDBACK | PAPERBACK | UNKNOWN>",
  "visibleIsbn": "<ISBN if printed visibly, else null>",
  "rawConfidence": <0.0–1.0>
}

Rules:
- Do NOT invent ISBNs. Only return one if you can literally read it.
- Do NOT guess publisher or year — that's looked up separately.
- If blurry, set rawConfidence < 0.5 and still return your best guess.
```

Three things this prompt does deliberately:

1. **Forbids the LLM from inventing data we'll get authoritatively.**
   ISBNs and publishers come from APIs. Claude only reports what it
   *sees*.
2. **Confidence as a first-class output.** A blurry photo of "The
   Stand" gets `rawConfidence: 0.3` and a guess; the UI can route low-
   confidence extractions to a manual-fix screen instead of saving
   silently.
3. **Closed enum on bindingGuess.** Without it, Claude would invent
   "softbound" or "trade paperback" — fine for humans, useless for a
   typed column.

Sending an image to Claude is a multi-block message:

```ts
await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 512,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type, data: base64 } },
      { type: 'text', text: VISION_PROMPT },
    ],
  }],
});
```

Cost per call (per Anthropic's published rates as of Jan 2026):

| Component | Tokens | $/M | Cost |
|---|---|---|---|
| Input — phone photo, resized | ~1,600 | 0.80 | $0.0013 |
| Input — prompt text | ~500   | 0.80 | $0.0004 |
| Output — JSON response       | ~300   | 4.00 | $0.0012 |
| **Total per book**           |        |      | **~$0.003** |

A thousand books → about $3. A library-sized 5,000 → $15.

## Step 3: Authoritative metadata from free APIs

Two database lookups, both free, both no-API-key:

**OpenLibrary** (`openlibrary.org/search.json`):
- ISBN search, title+author search, returns rich metadata
- Polite, slow, sometimes thin on recent books
- Cover image URL pattern: `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`

**Google Books** (`googleapis.com/books/v1/volumes`):
- Same query language (`isbn:`, `intitle:`, `inauthor:`)
- Faster and stronger on contemporary titles
- Cover thumbnails come back as `http://`; we rewrite to `https:` to
  avoid mixed-content blocks in the admin SPA

The service tries OpenLibrary first (richer for older books) and falls
back to Google Books if no hit:

```ts
export async function lookupByISBN(isbn: string) {
  return (await searchOpenLibrary({ isbn })) ?? (await searchGoogleBooks({ isbn }));
}
```

The result from either is normalized into a single `BookLookupResult`
shape — the route handler doesn't care which one answered.

## Step 4: The route — one transaction creates Item + BookDetails

`POST /api/books/from-photo` is multipart (the photo) + form fields
(originLocationId, optional categoryId/destinationLocationId/notes).
Flow:

1. Multer saves the photo to `DATA_PATH/images/<timestamp>-<name>`.
2. We call `extractFromPhoto()` (Claude). If `title` comes back empty,
   we 422 and return the extraction so the user can hand-fill instead.
3. We call `lookupByISBN()` if Claude saw an ISBN, else
   `lookupByTitleAuthor()`.
4. We resolve the category — defaults to "Books & Media" (the seed
   creates this; if it's been renamed, we'll create it on the fly).
5. **One transaction** creates the `Item` row, the `BookDetails` row,
   and an `ActivityLog` entry tagging the source. If anything throws,
   nothing commits.
6. Response includes `{ item, bookDetails, extraction, lookup }` — the
   front-end shows the user what was auto-detected vs. what came from
   the lookup, so they know what to double-check.

```ts
const result = await prisma.$transaction(async (tx) => {
  const item = await tx.item.create({ data: { name: lookup?.title ?? extraction.title, … } });
  const bookDetails = await tx.bookDetails.create({ data: { itemId: item.id, … } });
  await tx.activityLog.create({ data: { … } });
  return { item, bookDetails };
});
```

Two more endpoints exist but aren't auto-create:
- `POST /api/books/lookup` — pass an ISBN or title+author, get
  metadata. No DB write. For "I already have the ISBN typed in."
- `PATCH /api/books/:itemId` — update an existing item's BookDetails
  (creates the row if it doesn't exist). For the user's review-and-edit
  step.

## Bugs we hit (the pre-existing strict-mode tax)

This is where it got unfun. As soon as I tried to run `npm run
build:backend` to verify my new files, the compiler exploded. Not on
*my* code — on pre-existing code I hadn't touched.

### Bug 1: shared package wasn't a composite project
```
tsconfig.json(8,18): error TS6306: Referenced project must have setting "composite": true.
```
Backend's tsconfig has a project reference to shared, but shared's
tsconfig was missing `composite: true`. Fix: one line in
`packages/shared/tsconfig.json`. Effect: project references work as
intended; nothing else changes.

### Bug 2: pdf.tsx had JSX, but tsc wasn't told about it
```
src/services/pdf.tsx(259,11): error TS17004: Cannot use JSX unless the '--jsx' flag is provided.
```
Chapter 16 documented renaming `pdf.ts → pdf.tsx` — but only the
filename changed. The backend tsconfig never enabled JSX. Dev runtime
(`tsx` via nodemon) auto-handles JSX, so this never bit anyone. Prod
`tsc` does not. Fix: `"jsx": "react-jsx"` in
`packages/backend/tsconfig.json`.

### Bug 3: ~30 implicit-any errors in pre-existing files
The base tsconfig has `"strict": true` (which includes
`noImplicitAny`), but backend code throughout `routes/sync.ts`,
`services/csv-import.ts`, `services/pdf.tsx`, etc. uses bare `(c) =>
…` callbacks where Prisma's inferred type can't propagate. Pure dev
runtime (tsx) doesn't enforce it.

I had two choices: annotate every callback with `: any` or some real
type (mechanical, ~40 sites), or relax `noImplicitAny` for backend
specifically. I picked the second — keeping the actually-load-bearing
strict checks (null safety, etc.) on, dropping the noisy one. The
real fix is to type the Prisma queries with `Prisma.ItemGetPayload<…>`
generics, which is a future cleanup.

### Bug 4: Express type tightening on `req.params`
```
src/routes/exports.ts(18,46): error TS2345: 'string | string[]' not assignable to 'string'.
```
Newer `@types/express` started typing `req.params.<id>` as
`string | string[]`. Three routes pass `req.params.X` straight into
service functions expecting `string`. Cast each to `as string` — Express
doesn't actually parse params as arrays unless you opt in.

### Bug 5: jsonwebtoken v9 expiresIn typing
The library's `expiresIn` option is now typed as
`number | StringValue` (an opaque branded string). Passing a plain
`string` from env vars fails. Cast through `SignOptions['expiresIn']`
and ship it.

The honest read of all five bugs: **the prod build pipeline was never
working.** Every reference to "production" in the obsidian docs was
aspirational. Five small fixes in a single chapter wipe out the debt.

## Verifying

- `npm run build:shared` ✓
- `npm run build:backend` ✓ (was failing before any of my changes)
- `npx prisma generate` ✓ (Prisma Client picked up `BookDetails` and
  `BookBinding`)
- New files compile clean in isolation. Nothing in book code uses any
  of the patterns the strict-mode tax flagged.
- Did **not** run the new endpoints — that requires Postgres, which
  isn't running locally. The pipeline is verified by reading.

The admin frontend has its own pre-existing build issue (a
`@types/react` / `react-router-dom` `ReactNode`/`bigint` collision) —
also not caused by anything in this session, also tracked in BACKLOG.
The book feature is a backend-only landing in v1.2.0; the admin
"Add Book" page and mobile "Add Book" tab are explicit BACKLOG items
for the next session.

## Chapter takeaways

- **Sidecar tables beat JSON blobs** when the data is structured and
  you'll want to query it. ISBN lookup needs an index. JSON in Postgres
  can be indexed but it's awkward; a real column is one declaration.
- **LLM + lookup is a powerful pattern.** Let the LLM do what it's
  great at (reading a photo, identifying ambiguous text). Let an
  authoritative database do what *it's* great at (returning canonical
  identifiers). Don't make Claude recite ISBNs.
- **Confidence is a first-class output.** Bake it into the prompt's
  required fields. The UI can branch on it: high confidence → save
  with optional edits; low confidence → route to manual entry.
- **Close enums.** "What's the binding?" with no constraint gets you
  six different ways to say "paperback." With an enum, Claude returns
  one of six values or `UNKNOWN`.
- **Haiku for vision when the task is OCR-shaped.** Sonnet's reasoning
  edge doesn't help you read "Slaughterhouse-Five" off a cover.
- **You inherit every prior author's strict-mode debt.** When you turn
  on the build for the first time, the bill comes due.

---

# Chapter 21 — v1.2.0: The bulk path wins

> 📌 **What this chapter teaches.** Letting the user redirect your
> design when their workflow is different from your assumption. The
> "AI step lives outside the app" pattern. Why an offline script
> beats a paid endpoint when the job is one-time bulk.

**Date:** 2026-04-24, same v1.2.0 cut as Chapters 19 and 20. This
chapter exists because James read Chapter 20's design and asked a
better question.

## The redirect

Chapter 20 designed the book feature around an in-app camera flow:
phone snaps a cover, backend calls Claude Haiku, OpenLibrary fills in
the rest. Cost ~$0.003/book. Fine on paper.

Then James pushed back, paraphrased:

> "I don't want to spend money on the API. I have *thousands* of
> books — this is one big cataloging job, not an ongoing thing.
> Could I just have Claude or ChatGPT in a chat window do the vision
> step, hand me a list, and feed that into a script that does the
> lookup?"

That was the better question. Three reasons:

1. **The job shape.** "Catalog the entire household library before
   the move" is one-time bulk. After that the rate of adding new
   books is approximately zero. Building a permanent paid endpoint
   for a one-time task is the wrong shape.
2. **Free chat UIs already do vision.** claude.ai and chatgpt.com
   both accept image uploads in the free tier. Why pay per call when
   the same model is free in a different UI?
3. **The lookup step is free anyway.** OpenLibrary and Google Books
   have no auth and no quota for our scale. The Claude vision call
   was the only paid bit. Move it outside, the whole pipeline costs
   $0.

## What changed in the code

**Removed:**
- `POST /api/books/from-photo` — the multipart-upload-and-call-Claude
  endpoint. The route handler, the `extractFromPhoto()` service
  function, the `VISION_PROMPT` constant, the Anthropic SDK usage in
  `book-lookup.ts`. Gone.
- `BookExtraction` type from shared (no more vision step output to
  type).
- `fromPhotoExtraFieldsSchema` Zod validator.

**Kept:**
- `BookDetails` model and the migration — the data model is right.
- `BookBinding` enum — still useful for both the script and import.
- OpenLibrary + Google Books lookup helpers — now used by both the
  backend (for `POST /api/books/lookup`) and the offline script.
- `POST /api/books/lookup` (ISBN or title+author lookup, no DB write)
  and `PATCH /api/books/:itemId` (manual edit). Both small, both free.

**Added:**
- `scripts/enrich-books.mjs` — pure-Node script. Reads a pipe-delimited
  text file, hits OpenLibrary then Google Books per row, emits a CSV.
  No `import { Anthropic } from …` anywhere. About 200 lines.
- `POST /api/books/import-csv` — bulk import endpoint. Multipart CSV
  upload. Per row: resolves room name → ID, container label → ID,
  creates `Item` + `BookDetails` + optional `ItemPlacement` in one
  transaction. Returns per-row success/error counts so a 1,000-book
  import surfaces the 3 rows that failed instead of the whole batch
  aborting.

## The user's actual workflow

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Stage 1 (FREE)   │  │ Stage 2 (FREE)   │  │ Stage 3 (FREE)   │
│ Photos → list    │→ │ List → CSV       │→ │ CSV → Stash      │
│                  │  │                  │  │                  │
│ Phone Photos +   │  │ enrich-books.mjs │  │ Admin Books →    │
│ claude.ai/       │  │ (OpenLibrary +   │  │ Import CSV       │
│ chatgpt.com      │  │  Google Books)   │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

The user does Stage 1 in their existing free chat UI with a paste-in
prompt that returns `Title | Authors | ISBN` lines. They concat their
shelves into one text file. They run the script. They open the CSV in
their spreadsheet, add `originLocation`, `containerLabel`, `fate`
columns, save. They import. Done.

**Total AI cost:** $0.

## Why this is honestly better than what Chapter 20 designed

- **Reviewable middle.** The CSV exists between stages. James can
  open it, sort by `lookupConfidence`, fix the bad rows in Excel.
  The original API-driven flow had no human-readable artifact.
- **Pausable.** James can do 200 books a night for two weeks. The
  text files pile up. He runs the script once at the end. The API
  flow assumed he'd do it inline with the photo.
- **The placement columns.** James pointed out that the CSV row
  could carry `containerLabel` — so import doesn't just create the
  book, it also drops it into U-Box #4 in one step. The API flow
  needed a separate "now place this in a container" step.
- **No production AI key needed.** Stash deploys without any LLM
  configuration. Sell-pricing still uses Sonnet (separate, optional
  feature, 503s gracefully if no key). Books are pure free APIs.

## Bugs we hit

The pivot itself was clean. But on the way out the door, the build
exploded again — different errors than Chapter 19 covered.

### Bug 1: @types/express v5 widened ParamsDictionary

```
src/routes/categories.ts(34,14): error TS2322: Type 'string | string[]' 
is not assignable to type 'string | undefined'.
```

`@types/express@5.0.6` redefined `ParamsDictionary[key: string]` from
`string` (the v4 shape) to `string | string[]` to model some advanced
router patterns. The actual Express runtime is **4.21.0** —
the types and the runtime were mismatched. Pinned `@types/express` to
`^4.17.21` in `packages/backend/package.json` and added an `npm
overrides` block at the workspace root to force the same version on
transitive deps (`@types/multer` and friends were dragging in their
own @types/express).

```json
"overrides": {
  "@types/express": "^4.17.21",
  "@types/express-serve-static-core": "^4.19.6"
}
```

Wiped `node_modules` + lock + reinstalled to make the override stick.
Errors went from ~30 to 0.

### Bug 2: Map type inference under noImplicitAny: false

```
src/routes/books.ts(118,62): error TS2345: Argument of type 'Map<unknown, unknown>' 
is not assignable to parameter of type 'Map<string, string>'.
```

I had relaxed `noImplicitAny` in Chapter 19. That made
`locations.map((l) => [l.name, l.id])` infer as `any[]`, which made
`new Map(...)` infer as `Map<unknown, unknown>`. Two-line fix:
explicit tuple types on the map callbacks plus the Map generic.

## Verifying

- `npm run build:shared` ✓
- `npm run build:backend` ✓ (clean, no warnings)
- The new `enrich-books.mjs` is standalone — `node scripts/enrich-books.mjs`
  works without the backend at all (you can run it on any machine
  with Node 20).
- Endpoints: ready to hit on next deploy. CSV import is exercised
  through the existing CSV pattern, so high confidence it works
  the moment Postgres is up.

## Chapter takeaways

- **Listen when the user redescribes the workflow.** James's "could
  I just…" reframe was a better design than mine. The "AI must be in
  the app" assumption was inertia.
- **Match the tool to the job's shape.** One-time bulk is a script.
  Daily-use feature is an endpoint. Don't pay per call for a one-time
  task.
- **External AI + your own structured pipeline = good leverage.**
  Free chat UIs do the human-in-the-loop vision step well. Free
  databases do the lookup step well. Your code is the glue, not the
  intelligence.
- **A reviewable artifact in the middle is gold.** A CSV between the
  AI step and the database write means the user can scrub mistakes
  before they become DB rows.
- **Type pins matter.** Pinning `@types/express` to match runtime
  Express 4 cleared a 30-error build flood that had nothing to do
  with our actual code.
- **Removing code is a feature.** The diff for this chapter was net
  *negative* lines. Deleting the from-photo flow simplified the
  service, the route, the validator, the type module, and the
  documentation. Less surface area, lower maintenance, lower cost.

---

# Chapter 22 — v1.2.1: Container codes and the great intake-CSV import

> 📌 **What this chapter teaches.** Auto-generated unique identifiers,
> migrating data shape without losing user intent, the
> "honor-the-physical-label" heuristic, transactional auto-create
> during bulk imports.

**Date:** 2026-04-25, hours after v1.2.0 deployed. James handed over
a 320-row Google Forms CSV from a previous cataloging attempt and
asked for two things: (1) make container labels uniform/sortable
auto-generated codes instead of free text, and (2) import the
existing CSV without manual intervention.

## The ask

Two threads:

> "I want it to be uniform and unique so it can be sorted later... if
> we rename the label to something other than Tote, perhaps TOT12 or
> something easy and unique. TOT0012, I don't know. What do you
> think."

> "We can keep code unique again for clean organization and add an
> optional and editable note or description next to the code?"

That second message was the simplification. Not "label vs code, two
fields" — just "the label IS the code, friendly text lives on the
existing `Item.description`."

## The plan

- **Format:** `{PREFIX}-{NNNN}` — short type prefix, zero-padded
  4-digit sequence. `T27-0012`, `BXS-0001`, `UBX-0001`.
  - Sortable lexicographically thanks to the padding.
  - Filterable by prefix (`T27-*` = all 27-gallon totes).
  - QR-friendly.
- **Schema change:** `Container.label` becomes the code. Add
  `UNIQUE` constraint. Move friendly text to `Item.description`
  (which already exists). No new columns.
- **`TOTE_35GAL`** added with HDX 35-gal dimensions (the user's
  "Large Tote").
- **Helper:** `nextContainerCode(tx, type, preferredNumber?)` that
  honors a preferred sequence if free, else takes next available.
- **Helper:** `parseLegacyLabel("Tote #12")` returns
  `{ type: TOTE_27GAL, preferredNumber: 12, description: "Tote #12" }`.
- **CSV import:** when `containerLabel` column is present, look up
  by exact code first; if not found, parse as a legacy label and
  create the container on the fly. The user's CSV says "Tote #12";
  Stash creates `T27-0012` and uses "Tote #12" as the description.

## Step 1: The schema

```prisma
model Container {
  // …
  label String @unique
  // ↑ now contains "T27-0012", not "Halloween Box". QR codes encode it.
}
```

Migration:

```sql
ALTER TYPE "ContainerType" ADD VALUE 'TOTE_35GAL';
CREATE UNIQUE INDEX "containers_label_key" ON "containers"("label");
```

Two lines, additive. The unique constraint is safe to add because
the production DB had **zero** containers in it (the v1.2.0 deploy
seeded only the scaffold; no fake fixtures).

## Step 2: The honor-the-physical-label heuristic

The user has totes with sharpie numbers on them. They've been "Tote
#12" for months. We don't want to rename them in their own house.

```ts
export async function nextContainerCode(
  tx,
  type: ContainerType,
  preferredNumber?: number,
) {
  const used = new Set(/* existing seq numbers for this prefix */);
  if (preferredNumber && !used.has(preferredNumber)) {
    return { code: format(type, preferredNumber), usedPreferred: true };
  }
  let n = 1;
  while (used.has(n)) n++;
  return { code: format(type, n), usedPreferred: false };
}
```

Result: when the import sees `Tote #12` and the parser returns
`(TOTE_27GAL, 12)`, the helper checks if `T27-0012` is taken. Empty
DB → it's free → assign it. The physical sharpie number and the
digital code agree.

## Step 3: The legacy-label parser

```ts
export function parseLegacyLabel(label: string) {
  const lower = label.trim().toLowerCase();
  const numberMatch = label.match(/#\s*(\d+)/);
  const num = numberMatch ? parseInt(numberMatch[1], 10) : undefined;

  if (lower.startsWith('large tote')) return { type: TOTE_35GAL, preferredNumber: num, description: label };
  if (lower.startsWith('tote'))       return { type: TOTE_27GAL, preferredNumber: num, description: label };
  if (lower.startsWith('book box'))   return { type: BOX_SMALL,  preferredNumber: num, description: label };
  if (lower.startsWith('bin'))        return { type: BOX_SMALL,  preferredNumber: num, description: label };
  if (lower.startsWith('suitcase'))   return { type: CUSTOM,     preferredNumber: num, description: label };
  if (lower.match(/^uhaul|^u-haul|^u-box|^ubox/))
    return { type: UBOX, description: label };
  return null;
}
```

Six rules, covers the user's entire intake CSV. Anything that
doesn't match falls through to `CUSTOM` with the literal label
preserved as the description.

## Step 4: Auto-create during import

The CSV import — both `/api/import/csv` and `/api/books/import-csv`
— now share `resolveOrCreateContainer(rawLabel, originLocId, categoryId, userId)`:

1. Try exact match: maybe `rawLabel` already is a code (`T27-0012`).
2. If not, parse as a legacy label.
3. If parsable, get next code for that type using the parsed number.
4. If a container with that code already exists, reuse it.
5. Otherwise create the container (as a transactional Item +
   Container pair) and return its id.

The cache is per-import — multiple items in `Tote #12` only do one
DB lookup, then reuse.

## Step 5: The intake CSV transformation

`scripts/transform-intake-csv.mjs` reads the user's 320-row Google
Forms CSV and writes two import-ready files:

- `data/import/book-input.txt` — 53 book rows in the
  `Title|Authors|ISBN` format the enrichment script wants.
- `data/import/items.csv` — 159 real-location rows + 107 stale-
  location rows, with `containerLabel` set to "Tote #X" / "Book
  Box #1" / etc. for the real ones, and blank with
  `originLocation=Unsorted` for the stale ones (camping bins,
  outside-tent totes, wife's hurry-up bare-numbered totes).

Stale-detection rule lives in one Set in the transformer. Adding a
new stale container is a one-line edit.

## Step 6: The actual import

Production flow, end to end:

```
$ node scripts/enrich-books.mjs data/import/book-input.txt data/import/book-enriched.csv
📚 Enriching 53 books...
  [1/53] Wizardology... ✓ openlibrary
  …
  ✅ 52 matched, 1 unmatched (filter by lookupSource='no-match' to find them).

# add originLocation/containerLabel/fate/condition/notes columns
$ node -e "…" → book-final.csv

# scp to unraid, login, hit the endpoints
$ ssh unraid 'curl … /api/books/import-csv'
{"created":53,"placed":53,"containersCreated":1,"errors":[]}

$ ssh unraid 'curl … /api/import/csv/execute'
{"created":266,"placed":159,"containersCreated":14,"errors":[]}
```

After the smoke dust cleared, the database had:

| Code | Type | Description | Items |
|------|------|-------------|------:|
| `BXS-0001` | BOX_SMALL | Book Box #1 | 53 |
| `T27-0003` | TOTE_27GAL | Tote #03 | 14 |
| `T27-0010` | TOTE_27GAL | Tote #10 | 35 |
| `T27-0011` | TOTE_27GAL | Tote #11 | 29 |
| `T27-0012` | TOTE_27GAL | Tote #12 | 37 |
| `T27-0013` | TOTE_27GAL | Tote #13 | 25 |
| `T27-0020` | TOTE_27GAL | Tote #20 (Red) | 6 |
| `T27-0021` | TOTE_27GAL | Tote #21 (Red) | 6 |
| `T27-0030` | TOTE_27GAL | Tote #30 | 1 |
| `T27-0031` | TOTE_27GAL | Tote #31 | 1 |
| `T27-0033` | TOTE_27GAL | Tote #33 | 1 |
| `T35-0001` | TOTE_35GAL | Large Tote #01 | 1 |
| `CST-0001` | CUSTOM | Suitcase #1 | 1 |
| `CST-0003` | CUSTOM | Suitcase #3 | 1 |
| `CST-0004` | CUSTOM | Suitcase #4 | 1 |

15 containers, 212 active placements, 319 items, 107 in "Unsorted"
awaiting future re-cataloging. The physical-tote sharpie numbers
match the digital codes. Zero manual intervention beyond confirming
the design and running the script.

## Bugs we hit

### Bug 1: Books CSV import using the photo-filter multer

```
{"error":"Internal server error"}
…
Error: File type "application/octet-stream" not allowed.
```

The books `from-photo` endpoint had used `uploadPhoto` middleware
(image-only file filter). When v1.2.0 pivoted to the CSV import
flow but left the same middleware, CSV uploads got rejected. Fixed
with a dedicated `csvUpload` multer instance using
`memoryStorage()` and no fileFilter. One-commit fix
(`888776c`).

## Verifying

- `npm run build:shared` ✓
- `npm run build:backend` ✓ (all the prior pre-existing-debt fixes
  survived this round)
- Migration applied against prod via
  `docker compose exec stash-backend npx prisma migrate deploy`
- Re-seeded prod (DB was scaffold-only, no real data to lose):
  10 origin rooms (was 8 + 2 storage), 11 categories (was 10 + 1
  Camping)
- Imported 53 books + 266 items: zero errors
- `GET /api/containers` returns 15 containers in expected codes

## Chapter takeaways

- **Honor the user's physical world.** James had numbered totes for
  months. The auto-gen code respects "Tote #12" by trying T27-0012
  first. Software shouldn't make people relabel their stuff.
- **Auto-create on import beats two-phase wizards.** The original
  Step 11 import was a parse-then-map-then-execute wizard. With
  legacy-label parsing, the CSV is the only artifact: run it,
  containers and items appear together.
- **One unique field beats two parallel fields.** First design had
  `containerCode` + `label` (code + friendly name). User's
  pushback simplified to: label IS the code, friendly text uses
  the existing `Item.description`. No new column.
- **Cache resolved containers within a single import.** A 50-book
  shipment all going into `Book Box #1` shouldn't lookup-or-create
  50 times; one round-trip handles it.
- **Stale data is its own category, not a special case.** Items
  whose location is unknown go to a real `Unsorted` location, not
  a magic null. Querying "what do I still need to find?" is one
  filter.

---

# Chapter 23 — v1.2.2: Getting Stash onto the iPhones

> 📌 **What this chapter teaches.** The reality of "first-time" Expo
> setup in an existing npm-workspaces monorepo: every assumption that
> makes Expo's quickstart pleasant breaks slightly. Three back-to-back
> errors, each a different layer of the stack.

**Date:** 2026-04-25, late evening, hours after the intake CSV
imported. James was following the new `IPHONE-GUIDE.md` Part 1 trying
to get Stash running on his phone. The first `npx expo start --tunnel`
threw three different errors in succession. This chapter is the
forensics on each.

## The setup

```
PS D:\Code\personal\stash\packages\mobile> npx expo start --tunnel
Starting project at D:\Code\personal\stash\packages\mobile
Starting Metro Bundler
✔ The package @expo/ngrok@^4.1.0 is required to use tunnels, would you like to install it globally? ... yes
Tunnel ready.
[QR code rendered]
› Metro waiting on exp://qrliieu-anonymous-8081.exp.direct
```

So far so good. Phone scans QR, app starts loading, and then…

## Bug 1: Cannot find module 'babel-preset-expo'

```
iOS Bundling failed 394ms packages\mobile\App.tsx (1 module)
ERROR  Error: Cannot find module 'babel-preset-expo'
Require stack:
  - D:\Code\personal\stash\node_modules\@babel\core\lib\config\files\plugins.js
  - …
```

The mobile package's `babel.config.js` is one line:

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

`babel-preset-expo` is supposed to be a transitive dep of `expo` (which
mobile depends on), and indeed it gets installed at
`packages/mobile/node_modules/babel-preset-expo`. **But the require
stack shows the lookup happening from
`D:\Code\personal\stash\node_modules\@babel\core\lib\config\files\plugins.js`.**

That's `@babel/core` hoisted to the workspace **root**. When Babel
core resolves a preset, Node walks up from its own location:

1. `node_modules\@babel\core\node_modules\babel-preset-expo` — no
2. `node_modules\@babel\node_modules\babel-preset-expo` — no
3. `node_modules\babel-preset-expo` — **no, this is what fails**

The preset exists in mobile's nested `node_modules`, but Node's
hierarchical lookup starting from `@babel/core` at the root never
walks down into a sibling package's `node_modules`. Classic
workspaces hoisting mismatch.

**Fix:** add `babel-preset-expo` to the root `package.json`'s
`devDependencies`. This forces npm to hoist it to the root, where
`@babel/core` can find it.

```json
"devDependencies": {
  "marked": "^14.1.4",
  "babel-preset-expo": "^55.0.18"
}
```

`npm install`. Verify:

```
$ ls node_modules/babel-preset-expo
README.md  build  lazy-imports-blacklist.js  …
```

Onward.

## Bug 2: "main" has not been registered

```
iOS Bundled 6563ms packages\mobile\App.tsx (937 modules)
ERROR  [Invariant Violation: "main" has not been registered. This can happen if:
  * Metro (the local dev server) is run from the wrong folder.
  * A module failed to load due to an error and `AppRegistry.registerComponent` wasn't called.]
```

The bundle succeeded (937 modules, no Babel error). The app reaches
React Native's runtime and… can't find a registered root component.

`packages/mobile/package.json` had:

```json
"main": "App.tsx"
```

In older Expo SDKs (≤ 49), pointing `main` directly at `App.tsx` worked
because `expo/AppEntry.js` was used implicitly to register a default
export. **In SDK 50+, you have to be explicit.** The recommended
pattern:

```js
// packages/mobile/index.js
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

```json
"main": "index.js"
```

`registerRootComponent` is a one-line wrapper that calls
`AppRegistry.registerComponent('main', () => App)` AND ensures the JS
runtime is set up correctly for both Expo Go and bare native builds.

Onward (with `--clear` to wipe Metro's cache, since the failed bundle
was cached and would replay the same error otherwise).

## Bug 3: Invalid hook call / useContext null

```
iOS Bundled 6563ms packages\mobile\index.js (937 modules)
ERROR  Warning: Invalid hook call. Hooks can only be called inside of the body of a function component.
  1. You might have mismatching versions of React and the renderer (such as React DOM)
  2. You might be breaking the Rules of Hooks
  3. You might have more than one copy of React in the same app
ERROR  [TypeError: Cannot read property 'useContext' of null]
```

This one's the most subtle. The app bundles successfully and runs.
React Native's runtime starts. The first hook call (probably
`useContext` inside `AuthContext`) throws because React's internal
state is null.

The error message lists three possible causes; in a workspaces
monorepo it's almost always **#3: more than one copy of React.**
Confirmed:

```bash
$ cat node_modules/react/package.json | grep version
"version": "18.3.1",
$ cat packages/mobile/node_modules/react/package.json | grep version
"version": "19.1.0",
```

Two different React majors:

- Root `node_modules/react` is **18.3.1** (admin needs that — it's
  what `react-router-dom` v6 + `@types/react@~18.3.5` are built
  against; we pinned this in v1.2.0 to clear another bug).
- `packages/mobile/node_modules/react` is **19.1.0** (Expo SDK 54
  requires React 19).

Metro, by default, walks up the folder tree looking for modules. So a
single `import { useContext } from 'react'` could land in either
location depending on the calling file's path. Components from
`@react-navigation/*` (hoisted to root) ended up using one React;
components in `packages/mobile/src/*` ended up using the other.
Hooks blew up.

**Fix:** custom Metro resolver that pins React (and friends) to the
mobile package's copy. `packages/mobile/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so @stash/shared edits trigger reloads.
config.watchFolders = [workspaceRoot];

// Both paths so @stash/* (symlinked at root) resolves correctly.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// No directory-tree walking — only the explicit paths above.
config.resolver.disableHierarchicalLookup = true;

// Force React-family imports to ALWAYS resolve from mobile's own
// node_modules, regardless of which file does the importing.
const PINNED = new Set([
  'react', 'react-dom', 'react-native',
  'react/jsx-runtime', 'react/jsx-dev-runtime',
  'scheduler',
]);

const original = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (PINNED.has(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.js') },
      moduleName,
      platform,
    );
  }
  if (original) return original(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
```

The `resolveRequest` hook intercepts every module resolution. When it
sees one of the pinned packages, it spoofs the `originModulePath` to
`packages/mobile/index.js` — which forces Metro to start its
resolution walk from inside the mobile package, finding mobile's React
first. For everything else, the default resolver runs.

After `npx expo start --tunnel --clear`: app loads on the phone, login
screen appears, hooks work.

## Why this ends up being three bugs, not one

Each fix unblocks the next. None of them are exotic — but each is
specific to a layer of the stack:

1. **Bug 1** is a Node.js module-resolution problem (workspaces
   hoisting + Babel's preset lookup).
2. **Bug 2** is an Expo SDK version problem (auto-entry-point
   behavior changed in SDK 50).
3. **Bug 3** is a Metro bundler problem (resolver walking finds two
   Reacts in a workspaces tree).

If you ran a fresh `expo init` outside a monorepo, you wouldn't hit
any of them. If you tried to "add Expo" to an existing monorepo
without a metro.config.js, you'd hit all three back-to-back like we
did. Worth writing down because every Expo + monorepo bootstrap will
hit this.

## Verifying

- `npx expo start --tunnel --clear` runs to "Tunnel ready" without
  errors
- iPhone Camera scan loads Stash
- Login screen renders (which means hooks work)
- Pasting `http://100.122.58.114:3001` into Settings makes the API
  reachable; login as `jameshendershott85@gmail.com` / `password`
  works
- Item list displays (697 items including the 378 books we imported
  earlier in the day)

## Chapter takeaways

- **Workspaces + native frameworks = three things to fix, not one.**
  Babel preset hoisting, entry-point registration, React deduplication.
  Each is a different layer.
- **Read the require stack, not just the error.** Bug 1's error
  message looked like "package not installed"; the require stack
  showed it WAS installed, just not in the right place.
- **`Invalid hook call` in a monorepo means duplicate React 99% of
  the time.** Bug list in the error message says "you might have
  more than one copy of React" — believe it.
- **Metro's default resolver is wrong for monorepos.** Always set
  `disableHierarchicalLookup: true` *(⚠️ Revisited in Chapter 24 — this broke on SDK 57; hierarchical lookup is now back ON and the `resolveRequest` pin alone prevents duplicate React)* and explicit
  `nodeModulesPaths`. The official Expo docs cover this; the issue
  is that you don't know to look at them until after you've already
  failed.
- **`registerRootComponent` does two jobs:** registers the component
  AND sets up the JS runtime. Calling `AppRegistry.registerComponent`
  manually is not equivalent.
- **`--clear` matters.** Metro's cache will replay a previously
  cached failure even after you fix the underlying problem. Habit:
  `--clear` after every config change.

---

# Chapter 24 — v1.3.0: Five months later — SDK 57, and a password you can change

> 📌 **What this chapter teaches.** How mobile toolchains rot while
> you're not looking (***SDK coupling*** between Expo Go and your
> project), how to upgrade three major versions safely on a branch,
> why a config rule that was correct in April was wrong in September,
> how to test a mobile bundle **without a phone**, and a small but
> complete feature (change password) end to end.

**Date:** 2026-09-28. Last commit before this was `e019cb7` on
2026-04-25 — five months of no code changes.

## The ask

> "Fix the stale vault docs first. Then let's go through the project
> together and test out what we have so far on my phone."

Nothing in the repo had changed since April. Everything *around* it
had: the App Store version of Expo Go, the Expo CLI, Node (25 → 26).
"It worked last time" is not a guarantee for mobile.

## The plan

1. Reconcile the docs with reality (the Obsidian vault mirrors five of
   the repo's docs; both had drifted).
2. Confirm production is still healthy (`/api/health`, admin 200).
3. Start Expo, scan on the phone, and fix whatever breaks — on a
   branch (`upgrade/expo-sdk-57`) so `master` stays deployable.

## Step 1: Doc drift

The vault's `stash.md` still said *"v1.2.0 — not yet deployed"* while
production held 697 items. README listed WatermelonDB (removed in
v1.1.1) and an endpoint (`/api/books/from-photo`) that never existed.
GUIDE.md told you containers come from seed data (they haven't since
v1.2.0).

**Lesson:** docs rot fastest where they describe *state* ("not
deployed", "39 endpoints") rather than *how things work*. When you can,
point at the source of truth (`packages/backend/src/routes/`) instead
of copying a number that will go stale.

## Bug 1: "Project is incompatible with this version of Expo Go"

**Symptom.** Scan the QR → Expo Go refuses to open the project.

**Root cause.** ***Expo Go*** from the App Store ships with exactly
one Expo SDK's native modules — the newest. In April that matched our
SDK 54. By September Expo was on SDK 57 (`npm view expo dist-tags`
showed `latest: 57.0.25`), the phone had auto-updated Expo Go, and our
JS bundle expected native code the app no longer had.

**Alternatives considered.**

| Option | Why not |
|---|---|
| Install an old Expo Go | Not possible on iOS — the App Store only serves the current one |
| Custom dev build (EAS Build) | Needs a $99/yr Apple Developer account; overkill for now |
| **Upgrade the project to SDK 57** | ✅ Chosen. Free, and every future option needs it anyway |

**The upgrade:**

```bash
git switch -c upgrade/expo-sdk-57
cd packages/mobile
npx expo install expo@^57.0.0   # move the SDK itself
npx expo install --fix          # align every expo-* / RN package to SDK 57
npx expo-doctor                 # health check
```

`expo install` (not `npm install`) matters: it picks the exact versions
of `react-native`, `expo-camera`, etc. that were tested with that SDK.
Result: React 19.1 → 19.2, React Native 0.81 → 0.86, all `expo-*`
packages → 57.x.

Three follow-up fixes the upgrade required:

- **Root `package.json`:** `babel-preset-expo` bumped `^55` → `~57`
  (it's listed at the root so it hoists — see Chapter 23, Bug 1).
- **`app.json`:** removed the top-level `splash` key. SDK 57's config
  schema rejects it (expo-doctor flagged it). Expo Go doesn't show
  custom splash screens anyway.
- **`ItemDetailScreen.tsx`:** the image-picker enum was deprecated:

  ```ts
  // before (deprecated since SDK 52)
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  // after
  mediaTypes: ['images'],
  ```

## Bug 2: "Unable to resolve module expo-modules-core"

**Symptom.** Before involving the phone at all, we bundled locally:

```bash
npx expo export --platform ios --output-dir <scratch dir>
```

This is a great trick: it runs Metro exactly as the phone would and
fails loudly on any resolution error — no phone, no QR code, no tunnel.

```
Error: Unable to resolve module expo-modules-core from
  packages\mobile\node_modules\expo\src\Expo.ts:
  expo-modules-core could not be found within the project or in these directories:
  node_modules
  ..\..\node_modules
```

**Hypothesis: not installed?** Check:

```bash
find . -path '*/expo-modules-core/package.json'
# ./packages/mobile/node_modules/expo/node_modules/expo-modules-core/package.json
```

Installed — but *nested* inside `expo/node_modules/`. npm nests a
package under its parent when hoisting it higher would conflict with
another version.

**Root cause.** Chapter 23 set this in `metro.config.js`:

```js
config.resolver.disableHierarchicalLookup = true;
```

***Hierarchical lookup*** is Node's normal resolution rule: from the
importing file, walk *up* the directory tree checking each
`node_modules/`. Turning it off tells Metro "only look in the folders
listed in `nodeModulesPaths`" — which can never see
`expo/node_modules/expo-modules-core`. In SDK 54 nothing was nested
there, so it didn't matter. In SDK 57 it was fatal.

**Fix:**

```js
// Keep hierarchical lookup ON (the Expo default). npm nests some packages
// under their parent (e.g. expo/node_modules/expo-modules-core in SDK 57),
// and Metro can only find those by walking up the tree. Duplicate React is
// prevented by the resolveRequest pin below, not by disabling this.
config.resolver.disableHierarchicalLookup = false;
```

Why it's safe: the thing Chapter 23 was *really* protecting against —
two copies of React — is handled by the custom `resolveRequest` that
pins `react`, `react-native`, etc. to the mobile package. That pin
still runs. Disabling hierarchical lookup was belt-and-braces that
became a noose.

Re-running `expo export`: `iOS Bundled 5628ms (819 modules)` ✅

**Lesson.** Chapter 23's takeaway said *"Always set
`disableHierarchicalLookup: true`."* That rule was derived from one
dependency layout. Config that works around your `node_modules` shape
is only valid for that shape — re-verify it on every major upgrade.
`expo-doctor` had flagged exactly this line; the doctor was right.

## Bug 3: the ngrok install loop

**Symptom.**

```
✔ The package @expo/ngrok@^4.1.0 is required to use tunnels, would you like to install it globally? ... yes
Installed @expo/ngrok@^4.1.0
CommandError: Install @expo/ngrok@^4.1.0 and try again
```

…and again on every run, even though `npm ls -g @expo/ngrok` showed
`4.1.3` installed.

**Debugging.** Rather than guess, read the CLI's source. The prompt
text led to `@expo/cli/build/src/start/doctor/ngrok/ExternalModule.js`:
it tries a **local** resolve from the project root first, then
`resolveGlobal()` from `@expo/require-utils`. Calling that function
directly reproduced the failure:

```
ERR Cannot find module '@expo/ngrok/package.json'
  - node_modules/@expo/require-utils/build/resolveGlobal.js
```

So the global install succeeded but Expo's *global lookup* can't find
the global folder on this Windows / Node 26 setup.

**Fix.** Skip the global path — install it where the local lookup
looks first:

```bash
npm install -D -w packages/mobile @expo/ngrok@^4.1.0
```

Bonus: it's now in `package.json`, so it can't go missing on another
machine.

**Lesson.** When a tool says "install X" and X *is* installed, the bug
is in how the tool *finds* X. Read the resolver code; reproduce the
lookup in isolation.

## Not a bug: Expo Go wants you signed in

Current Expo Go requires the phone and the CLI to be logged into the
same Expo account to open a project over a tunnel: `npx expo login` on
the laptop, sign in inside Expo Go, restart the dev server (it reads
auth at startup).

## Bug 4: the app pointed at the wrong server

`packages/mobile/src/lib/api.ts` defaulted to the Tailscale IP over
plain HTTP, the login screen has no URL field, and the Settings value
isn't persisted (it resets every launch). Since v1.2.2 the public
HTTPS proxy is live, so it became the default:

```ts
// Default to the public HTTPS proxy — works on any network, no Tailscale
// needed. Override in Settings screen (Tailscale: http://100.122.58.114:3001).
let baseUrl = 'https://stash-api.shottsserver.com/api';
```

Verified with a deliberately wrong login: `401` means reachable and
answering. (Persisting the Settings value is on the backlog.)

## Step 2: Resetting a forgotten password (ops)

Nobody remembered the April password, and a "forgot password" email
flow needs an SMTP setup Stash doesn't have. The backend container
already has `bcrypt` and the Prisma client, so a script piped into it
is enough — `scripts/reset-password.cjs`:

```powershell
Get-Content scripts\reset-password.cjs | ssh unraid "docker exec -i -e EMAIL=you@example.com -e NEWPW='...' -w /app/packages/backend stash-backend node -"
```

Pieces worth knowing:

- `node -` runs a script read from **stdin**, so nothing is copied
  into the container.
- `-w /app/packages/backend` sets the working directory so
  `require('bcrypt')` resolves against the backend's `node_modules`.
- It hashes with the same cost factor (`10`) as `routes/auth.ts`, so
  logins can't tell the difference.

## Step 3: Feature — Change Password on the phone

The endpoint already existed (`POST /api/auth/change-password`: checks
the current password, Zod requires ≥ 8 characters). Only the mobile
side was missing.

**API client** (`lib/api.ts`):

```ts
changePassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
},
```

**Screen** (`SettingsScreen.tsx`) — validate on the phone *before* the
network call, in the order a person makes mistakes:

```ts
if (!currentPassword || !newPassword) { setPwError('Fill in your current and new password.'); return; }
if (newPassword.length < 8)            { setPwError('New password must be at least 8 characters.'); return; }
if (newPassword !== confirmPassword)   { setPwError('New passwords do not match.'); return; }
if (newPassword === currentPassword)   { setPwError('New password must be different from the current one.'); return; }
```

Why duplicate the server's 8-character rule? The server's Zod error
comes back as a generic `"Validation failed"`; the client check gives
a human sentence instantly. **The server stays the authority** — the
client check is UX only.

Other details:

- `err instanceof ApiError ? err.message : 'Could not reach the server.'`
  separates "the server said no" (*Current password is incorrect*)
  from "no network".
- `textContentType="password"` / `"newPassword"` lets iOS offer
  password autofill and strong-password suggestions.
- The screen became a `ScrollView` with
  `automaticallyAdjustKeyboardInsets` so the keyboard can't cover the
  fields.

## Verifying

- `npx expo export --platform ios` → bundles clean (819 modules).
- `tsc --noEmit` → no errors in the changed files.
- On James's iPhone: the app opens on SDK 57, login works against
  `https://stash-api.shottsserver.com`, and **the password was changed
  successfully from the new screen.**

## Chapter takeaways

- **Mobile projects rot while idle.** Expo Go tracks the newest SDK;
  an untouched project stops opening. Budget an upgrade whenever you
  come back after months away.
- **Upgrade on a branch, bundle before you scan.** `expo export` is a
  phone-free smoke test.
- **Config that works around dependency layout expires.** Chapter
  23's `disableHierarchicalLookup: true` was right for SDK 54 and
  wrong for 57. Re-check workarounds on every major bump — and listen
  to `expo-doctor`.
- **"Install X" when X is installed = a resolver bug.** Read the
  tool's lookup code and reproduce it in isolation.
- **Client-side validation is for humans; server-side is for truth.**

---

# Chapter 25 — Before code: redesigning Stash around how we actually use it

> 📌 **What this chapter teaches.** The part of engineering that
> happens before any code: turning a user's walkthrough into a spec,
> asking the questions that change the design, recording decisions as
> ***ADRs***, and ordering a build so every phase is usable on its own.
> No version number — nothing shipped. The full spec lives in the
> Obsidian vault note `stash-v2-spec.md`.

**Date:** 2026-09-28, right after Chapter 24 got the app running on
the phone again.

## The ask

After logging in on the phone, James asked: *"What does the app
currently do? Then we need to walk through what it SHOULD do and how
to make it work."*

## Step 1: Describe what exists — honestly

Before designing anything, we read every mobile screen and listed what
it can and can't do. The findings that mattered:

- Scanning a **container** QR showed a popup with an internal ID and
  went nowhere — the single most important scan was a dead end.
- The phone couldn't see containers at all, couldn't edit items
  beyond fate/photo, and couldn't put an item in a box.
- In short: the phone could *browse and decide*, but not *pack*.

**Lesson:** a feature list ("has a Scan tab") hides gaps that a
workflow walkthrough ("scan a tote, see what's inside") exposes
immediately.

## Step 2: Let the user describe workflows, not screens

The question asked was not "what screens do you want?" but *where are
you in the move, what's the main phone job, who uses it, and how does
a box live its life?* James's answers reframed the whole project:

- They're **renting** at 1642 W Blue Flax Dr and **unpacking** storage
  into standard totes — the NC move is on the back burner.
- Storage is a **storage unit** (6 wire racks × 5 shelves + floor) and
  **9 overhead garage shelves** James built.
- The core pain: *know what's in a tote without opening it.*
- Hard requirement: **everything doable from the phone.**

The existing data model assumed a move (ORIGIN house → DESTINATION
house, Keep/Sell/Donate/Trash). The real use is *storage*. That's
not a feature request — it's a different product shape.

## Step 3: Find the core relationship

Every use case reduced to one chain:

```
Item ──in──► Container ──at──► Location (Place › Area › Spot)
```

"Where are the baseball cards?" = follow the chain: *in #12 → Garage
› Overhead Shelf 2*. Once that was clear, every later feature
(labels, check-out, reminders) hung off one of those three links.

## Step 4: Questions that changed the design

Good clarifying questions offer a recommendation *and* the reason, so
the user can say "yes" quickly or push back with information you
didn't have.

| Question | Why it mattered | Decision |
|---|---|---|
| Put the lid color in the container ID? (`HDX27-12-Yellow`) | 14- and 27-gal HDX totes **share lids** — swap a lid and a permanent printed ID becomes wrong | ID is **just a number**; brand/size/colors are editable fields |
| Rack 5 Shelf 3 — which end is 1? | Ambiguity at the physical location defeats the whole app | Shelf 1 = bottom, racks left → right, plus a printed **legend** posted at the unit |
| Sold/disposed: delete or hide? | Hidden records answer "did we get rid of that?" | James chose **hard delete**; the activity log keeps a one-liner |
| What about the existing 697 items? | They're tagged to the *previous* house | Keep books + 7 known totes; back up, review, prune the rest |
| Email labels? | "Email" implies an SMTP server | The iPhone **Share sheet** covers Print, Mail, Files — no server |

One question James raised himself: **duplicate detection** — "are we
getting more of the same, or was this an accident?" That became a
pre-save check with four choices (another one / same item, I'm moving
it / different item / cancel).

## Step 5: The data model (additive)

Full tables are in the spec; the shape:

- `Location` gets a `parentId` — a ***self-relation*** turning a flat
  room list into a tree.
- `Category` gets a `parentId` for subcategories.
- New `ContainerModel` catalog table instead of growing the
  `ContainerType` enum — new tote models can be added from the phone
  with no migration.
- `Container` gets `number`, colors, `status` (Packing / Stored /
  Away), `locationId`, `labelStatus`.
- One new `Checkout` table serves **both** "checked out the drill" and
  "Christmas totes are at the house" — because containers *are* items,
  the same row shape works, and `fromLocationId` remembers the home
  spot.

**Why additive migrations?** Nothing is dropped. Old columns (`fate`,
`originLocationId`) become optional and fall out of the phone UI, so
the admin site and existing rows keep working while the new flows are
built. Each migration can ship alone.

### Duplicate search and Big-O

Checking "does this name look like anything we own?" naively means
comparing against every item: **O(n)** similarity computations per
add. With Postgres's ***pg_trgm*** extension and a GIN index on
trigrams, the database finds candidate rows sharing trigrams with the
query without scanning every row — roughly proportional to the number
of matching trigrams, not the table size. At 700 items either is
instant; at 10,000 (thousands of books) the index is the difference
between a snappy form and a lag on every add.

## Step 6: Build order — every phase usable on its own

| Phase | Delivers |
|---|---|
| 0. Foundation | Migration, real locations/categories/tote models, backup, data prune |
| 1. Find it | Search with full whereabouts; scan a tote → contents |
| 2. Quick Add | Camera-first add, put in a container, duplicate check |
| 3. Ready for Storage + labels | Numbers, locations, Phomemo/sheet/legend printing |
| 4. Check out / transfer / archive / delete | Day-to-day use |
| 5. Reminders | Scheduler + in-app inbox (install method decided first) |
| 6. AI photo fill | Photo → fields; books catalogued |

Reasoning: **read before write** (Phase 1 is useful with just the 7
existing totes), and **AI last** because it plugs into the Add flow
without changing it — so its cost discussion doesn't block anything.
This is the ***walking skeleton*** idea from LEARN.md Part 2 applied at
the feature level.

## Chapter takeaways

- **Ask about workflows, not screens.** "How does a box live its
  life?" produced the whole design; "what screens do you want?" would
  have produced a wishlist.
- **Find the core relationship first** (Item → Container → Location);
  features hang off it.
- **Offer a recommendation with each question.** It turns a
  questionnaire into quick yes/no decisions — and the "no"s carry the
  information you were missing.
- **IDs should never encode mutable facts.** A lid color can change;
  a printed number can't.
- **Additive migrations let the old and new coexist** while you build.

---

# Chapter 26 — Docs that point the same direction (for humans *and* AI sessions)

> 📌 **What this chapter teaches.** Documentation has several
> audiences — you in six months, Savanah using the app, and AI coding
> sessions that start with zero memory. After a change of direction,
> every entry point has to say the same thing, or the next session
> builds the old product.

**Date:** 2026-09-28, after Chapter 25's spec was agreed.

## The ask

> "Clean up all the documentation to ensure it's in line with the new
> direction, and also ensure that any new session that reads this code
> base or vault documentation knows to follow the skill and what we
> are doing."

## The plan

List every place a reader (or a session) *starts*, and make each one
answer three questions in its first screen: **what are we building
now, where's the plan, and what are the rules?**

| Entry point | Who lands there | Before | After |
|---|---|---|---|
| Repo `CLAUDE.md` | Every coding session (auto-loaded) | SDK 54, WatermelonDB, "Colorado rooms", "never hard-delete" | "Start here" + session rules at the top; stale facts fixed |
| Vault folder | Sessions started in Obsidian | **No `CLAUDE.md` at all** | New `CLAUDE.md` pointing to the spec, repo, and rules |
| `README.md` | Humans on GitHub | "move management application" | Storage direction + link to `SPEC.md` |
| `SPEC.md` | Everyone | Only in the vault | Mirrored into the repo, with a Progress checklist |
| `BACKLOG.md` | Planning | Flat wish list | Grouped: scheduled (→ phase), unscheduled, back-burnered, tech debt, done |
| `GUIDE.md` / `IPHONE-GUIDE.md` / `SETUP.md` / `TAILSCALE.md` | Users | Pre-SDK-57 steps, "no change-password screen" | Expo login, SDK coupling, HTTPS default, Change Password |
| Vault `stash.md` | James | "Inventory & Move Manager", v1.2.2 | Storage direction, v1.3.0 status, roadmap = spec phases |

## Step 1: Rules, not just facts

A `CLAUDE.md` that only describes the code tells a session *what is*,
not *what to do*. The new "Session rules" section is explicit:

1. Follow `teach-as-you-build` for every change — chapter, LEARN/ADR,
   CHANGELOG, `build:wiki` — **before committing**.
2. Destructive data changes: backup, show the list, wait for a yes.
3. Keep doc mirrors identical (repo ↔ vault).
4. Phone-first.
5. If auto mode blocks a deploy, hand over the commands — don't work
   around it.

## Step 2: Back-burner, don't delete

GUIDE.md still documents destination rooms and the NC floor plan —
because those features *still exist*. Deleting the docs would make a
working feature undiscoverable; leaving them unmarked would suggest
it's the focus. The middle path: a banner ("back-burnered") on each.

## Step 3: One source, mirrored

The spec lives where James thinks (Obsidian) *and* where sessions code
(the repo). Two copies drift unless a rule says otherwise, so both
`CLAUDE.md` files state the mirror pairs and the rule: *edit one, copy
to the other.* That decision is ADR-007 in `LEARN.md`.

## Verifying

- Grep for stale terms across all docs (`SDK 54`, `WatermelonDB`,
  `Colorado`, `stash.local`, `from-photo`) — remaining hits are
  intentional (historical chapters, "removed in v1.1.1" notes).
- `cmp` confirms each vault mirror is byte-identical to its repo file.
- `npm run build:wiki` regenerated the HTML.

## Chapter takeaways

- **Every entry point should answer: what now, where's the plan,
  what are the rules.**
- **AI sessions start from zero** — `CLAUDE.md` is their onboarding
  doc. Put direction and rules at the top, reference detail below.
- **Back-burner with a banner; don't delete docs for code that still
  runs.**
- **Mirrored docs need a written sync rule**, or they drift (Chapter
  24 started by fixing exactly that drift).

---

# Glossary

Terms in **bold italic** in chapter text are defined here.

| Term | Meaning |
|---|---|
| AABB | Axis-Aligned Bounding Box. Collision check via comparing min/max on x/y/z. Fast and correct when shapes don't rotate freely. |
| ADR | Architecture Decision Record. A short document capturing why a design choice was made. See `LEARN.md`. |
| Anthropic SDK | `@anthropic-ai/sdk` — the Node client for the Claude API. Used by `packages/backend/src/services/pricing.ts`. |
| auth | Shorthand for authentication (who are you?) + authorization (what can you do?). JWT + `requireAuth`/`requireAdmin`. |
| enums | Prisma / TypeScript types with a fixed set of named values. `Fate`, `Condition`, `ContainerType`. |
| Expo | A React Native toolkit and managed runtime. Includes `expo-camera`, `expo-secure-store`, etc. |
| Expo Go | The prebuilt Expo runtime that runs your JS without a native build. Can't load custom native modules. |
| Expo Go SDK coupling | The App Store's Expo Go only runs projects on its bundled (latest) SDK. An idle project on an older SDK stops opening until upgraded (Chapter 24). |
| hierarchical lookup | Node/Metro module resolution that walks up the directory tree checking each `node_modules/`. Needed to find packages npm nests under their parent (Chapter 24). |
| pg_trgm | Postgres extension that splits text into 3-character "trigrams" for fuzzy matching; with a GIN index it finds similar names without scanning every row. Planned for duplicate detection (Chapter 25). |
| self-relation | A table with a foreign key to itself (`Location.parentId → Location.id`) — how trees like Place › Area › Spot are stored. |
| walking skeleton | Building the thinnest end-to-end version first, then thickening it. Applied per phase in Chapter 25. |
| FUSE/shfs | Unraid's user-share filesystem at `/mnt/user/` that unions the array + cache pools. Adds I/O latency that's catastrophic for database containers — pin Postgres to `/mnt/cache/` instead. |
| sidecar table | A 1:1 companion table that holds type-specific fields off a generic parent. `Container` and `BookDetails` are both sidecars on `Item`. Lets you query `WHERE binding='HARDBACK'` without polluting the parent schema with mostly-null columns. |
| KSDT | Keep / Sell / Donate / Trash. The `Fate` enum. |
| MeshPhongMaterial | A Three.js material that responds to lights with diffuse + specular shading. Needs at least one light in the scene. |
| multipart/form-data | The HTTP content type used for file uploads. Multer parses it. |
| Multer | Express middleware for parsing `multipart/form-data`. `packages/backend/src/middleware/upload.ts`. |
| OrbitControls | Three.js addon for mouse-driven camera orbit/pan/zoom. Standard for 3D inspectors. |
| React Router | `react-router-dom` — declarative routing for React SPAs. Nested `<Route>`s with `<Outlet/>`. |
| Router | Either the Express subrouter (`express.Router()`) or the React one, depending on context. |
| safety guard | A check that blocks a destructive operation based on business rules ("can't delete yourself", "can't remove last admin"). Returns 400. |
| schema | In Prisma: the models file that generates SQL + TS types. In Zod: the runtime validation object. |
| schema validation | Checking that incoming data matches a declared shape. Zod does this in the validator middleware. |
| SecureStore | `expo-secure-store` — encrypted key/value storage on mobile. Used for JWTs and the server URL. |
| Three.js | The JS 3D library used for the container viewer. `packages/backend/public/container-3d.html`. |
| transaction | `prisma.$transaction(...)` — multiple writes committed atomically. Used for Item+Container creation and user-delete-with-reassignment. |
| WatermelonDB | A reactive offline-first database for React Native. Requires native modules, incompatible with Expo Go. Currently unused (Chapter 18). |
| workspaces | npm's monorepo feature. Root `package.json` declares workspace paths; packages import each other by name. |

---

*This is a living document. New chapters land here whenever a
feature ships, a bug is fixed, or an architectural decision is made.*
