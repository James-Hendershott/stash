# Stash — Learning Journal

This file is written as we build Stash, step by step. Each section explains
what was built, why decisions were made, and teaches the underlying concepts.

> **Historical journal (Steps 1–16, through v1.0.0).** Kept as written for
> learning value — some details were later changed:
> - **Step 8 (WatermelonDB)** was removed in v1.1.1 so the app runs in Expo Go.
> - Example logins like `james@stash.local` / `password123` no longer exist —
>   the seed now creates real accounts with passwords from `SEED_ADMIN_PASSWORD` /
>   `SEED_USER_PASSWORD`.
> - Container labels are now auto-generated codes (`T27-0012`) as of v1.2.1.
>
> For v1.1 onward, see **BUILD_LOG.md** (chapter-per-version) and **CHANGELOG.md** in the repo.

---

## Step 1: Project Scaffolding

### What We Built

A **monorepo** — a single Git repository containing multiple related packages
(projects) that work together. Our monorepo has four packages:

```
stash/
├── packages/
│   ├── shared/    → Types, constants, utilities shared by all packages
│   ├── backend/   → Express API server
│   ├── admin/     → React web dashboard
│   └── mobile/    → React Native mobile app
```

### Why a Monorepo?

The alternative is separate repos for each package. Monorepos are better here because:

1. **Shared code** — `@stash/shared` defines types like `Item`, `Container`, `Fate`
   once. The backend, admin, and mobile all import the same definitions. If you
   change a type, all packages see the change immediately.

2. **Atomic changes** — When an API endpoint changes its response shape, you can
   update the backend, shared types, and admin frontend in one commit.

3. **Simpler tooling** — One `npm install` at the root installs everything.

### npm Workspaces

In `package.json` at the root, the `"workspaces"` field tells npm: "These folders
are sub-packages. When one references another, link them locally instead of
downloading from npmjs.com."

```json
"workspaces": [
  "packages/shared",
  "packages/backend",
  "packages/admin",
  "packages/mobile"
]
```

When `@stash/backend` has `"@stash/shared": "*"` in its dependencies, npm creates
a symlink from `packages/backend/node_modules/@stash/shared` → `packages/shared/`.
No publishing needed.

**Try it:** After running `npm install`, look inside
`packages/backend/node_modules/@stash/shared` — it's a symlink to `../../../shared`.

### TypeScript Configuration

We use a **base config** (`tsconfig.base.json`) with shared settings, and each
package **extends** it with its own specifics:

```
tsconfig.base.json          → Strict mode, ES2022, common rules
  └── packages/shared/tsconfig.json    → Compiles to dist/
  └── packages/backend/tsconfig.json   → Same, references shared
  └── packages/admin/tsconfig.json     → JSX, DOM libs, no emit (Vite handles it)
  └── packages/mobile/tsconfig.json    → Extends Expo's base config
```

**Why "strict: true"?** TypeScript's strict mode catches bugs at compile time.
It's annoying at first (more type annotations needed) but saves debugging time
in the long run. Since we're starting fresh, strict from day one is free.

### The Shared Package (@stash/shared)

This package defines the "vocabulary" of Stash — every part of the system
agrees on what an Item is, what Fates are possible, how containers are sized.

**Types** (`src/types/`) — TypeScript interfaces and enums matching our database
schema. These don't exist at runtime — they're compile-time contracts.

```typescript
// If you write this in the backend:
const item: Item = { fate: 'BANANA' };
// TypeScript will error: '"BANANA"' is not assignable to type 'Fate'
```

**Constants** (`src/constants/`) — Values that are the same everywhere:
- Container default dimensions (a U-Box is always 95"×56"×83")
- Fate colors (KEEP is always #16A34A green)

**Utilities** (`src/utils/`) — Pure functions for formatting:
- `formatDimensions(24, 16, 14)` → `'24"L × 16"W × 14"H'`
- `calcFillPercent(5000, 10000)` → `50`

### Docker Compose — Three Files, One System

Docker Compose lets you define multi-container applications. We use three files
that **layer on top of each other**:

```
docker-compose.yml          → Base: defines all 3 services and their relationships
docker-compose.dev.yml      → Dev overrides: hot reload, exposed DB port
docker-compose.prod.yml     → Prod overrides: restart policy, external network
```

**How layering works:** When you run:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```
Docker merges both files. The dev file overrides specific settings in the base.
Same code, different behavior per environment.

**Why three files instead of one?**
- `docker-compose.yml` alone is enough to describe what Stash needs
- `dev` adds source code bind mounts (so changes appear without rebuilding)
  and exposes Postgres on port 5434 (so you can connect with a DB tool)
- `prod` adds restart policies, uses the Unraid `shottsproxy` network
  (so Nginx Proxy Manager can route to our containers), and locks down ports

### DATA_PATH — The Portability Trick

The `DATA_PATH` environment variable is the key to running the same Docker Compose
on your laptop and on Unraid:

| Environment | DATA_PATH | Where files end up |
|---|---|---|
| Local dev | `./data` | `/home/boompy/projects/stash/data/images/` |
| Unraid prod | `/mnt/user/appdata/stash` | `/mnt/user/appdata/stash/images/` |

In `docker-compose.yml`, volumes use `${DATA_PATH:-./data}` — the `:-` means
"use `./data` if DATA_PATH isn't set." On Unraid, `.env` sets it explicitly.

### Dockerfiles — Multi-Stage Builds

Each Dockerfile has multiple stages:

```dockerfile
FROM node:20-alpine AS development   # Stage 1: dev (has devDeps, hot reload)
FROM development AS build            # Stage 2: compile TypeScript
FROM node:20-alpine AS production    # Stage 3: lean image with only compiled code
```

**Why multi-stage?**
- Development image: has nodemon, tsx, all devDependencies (~500MB)
- Production image: only compiled JS + production deps (~150MB)

When Docker builds with `target: development`, it stops at stage 1.
When it builds for production (default), it goes through all stages
and produces the smallest possible image.

### ESLint + Prettier — Code Quality

- **Prettier** formats code consistently (semicolons, quotes, line width).
  It's opinionated on purpose — no debates about style.
- **ESLint** catches logical issues (unused variables, implicit any types).

They're configured at the root and apply to all packages.

### .gitignore — What NEVER Gets Committed

Critical entries:
- `.env` — Contains passwords, API keys. Each environment has its own.
- `data/` — Runtime data (database files, uploaded images). This lives on
  the host machine, not in the repo.
- `LEARNING.md` — Explicitly forbidden per project constraints.
- `node_modules/` — Installed dependencies. Recreated by `npm install`.
- `dist/` — Compiled output. Recreated by `npm run build`.

### What's Next

Step 2 will add the Prisma schema (database models), run migrations to
create the actual PostgreSQL tables, and write the seed script that
populates the database with users, locations, and categories. That's
where we'll dive deep into how ORMs work and why Prisma is great for
this kind of project.

### Commands to Explore

```bash
# See the workspace structure
cat package.json | grep -A 6 workspaces

# Verify shared package builds
cd packages/shared && npx tsc && ls dist/
# You should see compiled .js and .d.ts files

# Check Docker Compose config (merged dev)
docker compose -f docker-compose.yml -f docker-compose.dev.yml config

# See what .gitignore covers
git status --ignored --short
```

---

## Step 2: Prisma Schema, Migrations & Seed Data

### What We Built

Three new files that define and populate the database:

```
packages/backend/prisma/
├── schema.prisma    → Database model definitions (the "blueprint")
└── seed.ts          → Script that fills the database with dev data
```

When you run `npx prisma migrate dev`, Prisma reads `schema.prisma` and
generates a SQL migration file that creates the actual PostgreSQL tables.
When you run `npx prisma db seed`, it runs `seed.ts` to insert starter data.

### What Is an ORM?

ORM stands for **Object-Relational Mapping**. It's a layer between your
application code and the database. Without an ORM, you'd write raw SQL:

```sql
SELECT * FROM items WHERE fate = 'KEEP' AND category_id = '...';
```

With Prisma (our ORM), you write TypeScript:

```typescript
const items = await prisma.item.findMany({
  where: { fate: 'KEEP', categoryId: '...' },
});
```

**Why this matters:**
1. **Type safety** — Prisma generates TypeScript types from your schema. If you
   mistype `catagoryId`, the compiler catches it before you run anything.
2. **Migrations** — Schema changes are tracked as versioned SQL files, like Git
   for your database structure.
3. **No SQL injection** — Prisma parameterizes all queries automatically.

### The Schema File — schema.prisma

This is the single source of truth for the database structure. Let's walk
through its key sections:

#### Generator & Datasource

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- **generator** tells Prisma to create a JavaScript/TypeScript client library.
  After running `prisma generate`, you get auto-completed, type-safe functions
  like `prisma.item.findMany()`.
- **datasource** says "we're using PostgreSQL" and reads the connection string
  from the environment. This means the same schema works for local dev (your
  Docker Postgres) and production (Unraid's Postgres).

#### Enums — Restricted Value Sets

```prisma
enum Fate {
  KEEP
  SELL
  DONATE
  TRASH
  UNDECIDED
}
```

An **enum** (enumeration) is a type that can only be one of a fixed set of
values. In the database, PostgreSQL creates an actual enum type. In TypeScript,
Prisma generates a matching `Fate` type.

**Why not just use strings?** If the Fate column were a plain text field,
someone could insert "KEEEP" or "keep" or "banana". Enums enforce correctness
at the database level — the database itself rejects invalid values.

We define enums for: `Role`, `Condition`, `Fate`, `ShapeType`, `ContainerType`,
and `LocationType`.

#### Models — Database Tables

Each `model` block becomes a table. Here's the Item model annotated:

```prisma
model Item {
  // Primary key — UUID generated automatically
  id          String    @id @default(uuid())

  // Basic fields
  name        String    // Required text
  description String?   // Optional text (the ? makes it nullable)
  quantity    Int       @default(1)    // Defaults to 1 if not specified

  // Enum field
  fate        Fate      @default(UNDECIDED)

  // Foreign key — links to another table
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])

  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt      // Auto-updates on every save
  deletedAt   DateTime?                 // Null = not deleted (soft delete)

  // Index for faster queries
  @@index([categoryId])

  // Custom table name in PostgreSQL
  @@map("items")
}
```

**Key concepts:**

- **`@id @default(uuid())`** — Every row gets a unique ID. UUIDs (like
  `f47ac10b-58cc-4372-a567-0e02b2c3d479`) are better than auto-increment
  integers for distributed systems because two devices can create items
  offline and never collide.

- **`String?` vs `String`** — The `?` makes a field optional (NULL in SQL).
  Every item has a name, but not every item has a description.

- **`@default(now())`** — PostgreSQL fills this in automatically. You don't
  need to pass `createdAt` when creating a record.

- **`@updatedAt`** — Prisma automatically sets this to the current time on
  every `update()` call. No manual tracking needed.

- **`@@map("items")`** — The model is called `Item` in code (PascalCase, as
  TypeScript convention) but the actual table name in PostgreSQL is `items`
  (lowercase, as SQL convention).

#### Relations — How Tables Connect

Stash has several types of relationships:

**One-to-Many:** A Category has many Items, but each Item belongs to one Category.
```prisma
model Category {
  items Item[]      // One category → many items
}
model Item {
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
}
```
The `categoryId` column in the items table stores the actual foreign key.
The `category` and `items` fields are "virtual" — they don't exist as columns
but let Prisma generate JOINs when you query related data.

**One-to-One:** Each Container is linked to exactly one Item (the container
itself is an item — a box is a thing you own too).
```prisma
model Container {
  itemId String @unique    // @unique enforces one-to-one
  item   Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```
`onDelete: Cascade` means: if the Item is deleted, also delete the Container
record. Without this, deleting an item would leave an orphaned container row.

**Multiple relations to the same table:** Items have both an origin and a
destination location. Prisma needs named relations to distinguish them:
```prisma
model Item {
  originLocation      Location  @relation("OriginLocation", ...)
  destinationLocation Location? @relation("DestinationLocation", ...)
}
model Location {
  originItems      Item[] @relation("OriginLocation")
  destinationItems Item[] @relation("DestinationLocation")
}
```

#### Indexes — Making Queries Fast

```prisma
@@index([categoryId])
@@index([fate])
@@index([deletedAt])
```

Without an index, finding all KEEP items requires scanning every row in the
items table. With an index on `fate`, PostgreSQL maintains a sorted lookup
structure — like a book's index that says "KEEP: pages 3, 7, 15, 22..."

We add indexes on:
- Foreign keys (`categoryId`, `originLocationId`) — for JOIN performance
- Frequently filtered fields (`fate`, `deletedAt`) — for WHERE clauses
- Activity log timestamps (`createdAt`) — for "recent activity" queries

**Rule of thumb:** Index columns you filter or sort by. Don't index everything —
each index slows down INSERT/UPDATE slightly because the index must be updated too.

### The Seed Script — prisma/seed.ts

Seeding populates the database with development data so you have something to
work with immediately. Our seed script creates:

| Data | Count | Purpose |
|------|-------|---------|
| Users | 2 | Admin (James) and regular user (Ashley) |
| Origin locations | 8 | Rooms in the Colorado house |
| Destination locations | 5 | Rooms in the NC house |
| Categories | 10 | Furniture, Electronics, Kitchen, etc. |
| Containers | 3 | U-Box, tote, medium box |
| Items | 19 | Realistic household items across rooms |
| Placements | 4 | Items placed into containers |
| Activity logs | 3 | Sample audit trail entries |

**Idempotency** — The seed script deletes all existing data before inserting.
This means you can run it repeatedly and always get the same result. Deletion
order matters: you must delete ItemPlacements before Items (because placements
reference items), and Items before Categories (because items reference categories).
This is called **reverse dependency order**.

**Password hashing** — The seed creates users with `password123`, but stores
a bcrypt hash, not the plaintext. When a user logs in later, we'll hash
their input and compare the hashes. This means even if someone steals the
database, they can't read passwords.

```typescript
const passwordHash = await bcrypt.hash('password123', 10);
//                                                     ^^
// "10" is the salt rounds — how many times bcrypt re-hashes.
// Higher = more secure but slower. 10 is standard.
```

### Soft Deletes

Notice that Item has a `deletedAt` field:
```prisma
deletedAt DateTime?  // null means "not deleted"
```

Instead of `DELETE FROM items WHERE id = '...'`, we do:
```typescript
await prisma.item.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

**Why soft delete?** When someone accidentally deletes their grandmother's antique
dresser from the inventory, you can undo it. Hard deletes are permanent. In
our queries, we'll add `where: { deletedAt: null }` to only show active items.

### Migrations — Version Control for Your Database

When you run:
```bash
npx prisma migrate dev --name init
```

Prisma:
1. Reads `schema.prisma`
2. Compares it to the current database state
3. Generates a SQL migration file in `prisma/migrations/`
4. Runs that SQL against the database
5. Regenerates the Prisma client

The migration file is committed to Git. When another developer (or production)
runs `prisma migrate deploy`, it replays all migrations in order to reach the
current schema state. This is how database changes stay synchronized across
environments.

**Important distinction:**
- `prisma migrate dev` — For development. Creates the migration AND applies it.
  Can also reset the database if schemas diverge.
- `prisma migrate deploy` — For production. Only applies existing migrations.
  Never creates new ones. Safe and predictable.

### The Prisma Client — How You'll Use This

After `prisma generate`, you import and use the client like this:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create an item
const item = await prisma.item.create({
  data: {
    name: 'Standing Desk',
    fate: 'KEEP',
    categoryId: category.id,
    originLocationId: location.id,
    addedById: user.id,
    lastModifiedById: user.id,
  },
});

// Find all items in a category, with their location
const items = await prisma.item.findMany({
  where: { categoryId: '...', deletedAt: null },
  include: { originLocation: true, category: true },
  orderBy: { createdAt: 'desc' },
});

// Update an item's fate
await prisma.item.update({
  where: { id: item.id },
  data: { fate: 'SELL', estimatedSaleValue: 150 },
});
```

Every method is fully typed. `item.fate` will autocomplete to the Fate enum.
`include: { originLocation: true }` tells Prisma to JOIN the locations table
and return the location object nested inside each item.

### How Schema, Types, and Client Relate

```
schema.prisma (source of truth)
    │
    ├──► prisma generate ──► @prisma/client (auto-generated TypeScript types + query builder)
    │                         Used by: backend routes, services
    │
    └──► prisma migrate  ──► PostgreSQL tables (actual database structure)
                              Used by: the running database

@stash/shared types (manually written)
    │
    └──► Used by: admin dashboard, mobile app, backend API responses
         These match the Prisma schema but are separate because the
         frontend doesn't use Prisma — it receives JSON from the API.
```

The shared types and Prisma types should always match. If you add a field
to the schema, also add it to the shared types. In a future step, we could
auto-generate shared types from Prisma, but for now keeping them in sync
manually is fine for a small team.

### What's Next

Step 3 will add the backend API routes — Express endpoints that use the Prisma
client to create, read, update, and delete items, containers, and placements.
That's where the schema becomes real: actual HTTP requests that query the
database and return JSON.

### Commands to Explore

```bash
# Start the database (if not already running)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d stash-postgres

# Create the initial migration (run from packages/backend/)
cd packages/backend && npx prisma migrate dev --name init

# Seed the database
npx prisma db seed

# Open Prisma Studio — a web GUI for browsing your data
npx prisma studio
# Opens http://localhost:5555 with a visual table browser

# View the generated SQL migration
ls prisma/migrations/
cat prisma/migrations/*/migration.sql

# Explore the generated Prisma client types
# In your editor, Ctrl+click on 'PrismaClient' in src/lib/prisma.ts
# to see all the generated types and methods
```

---

## Step 3: Backend API Routes

### What We Built

A complete REST API with 8 route groups, authentication middleware, and
request validation:

```
packages/backend/src/
├── middleware/
│   ├── auth.ts          → JWT verification + role checking
│   └── validate.ts      → Zod schema validation middleware
├── validators/
│   ├── auth.ts          → Login/password schemas
│   ├── items.ts         → Item create/update schemas
│   ├── containers.ts    → Container create/update schemas
│   ├── locations.ts     → Location create/update schemas
│   ├── categories.ts    → Category create/update schemas
│   └── placements.ts    → Placement create/remove schemas
├── routes/
│   ├── auth.ts          → POST /login, /change-password, GET /me
│   ├── items.ts         → Full CRUD + fate shortcut
│   ├── containers.ts    → CRUD (creates Item + Container together)
│   ├── locations.ts     → CRUD with referential integrity checks
│   ├── categories.ts    → CRUD with referential integrity checks
│   ├── placements.ts    → Place/remove items in containers
│   ├── activity.ts      → Paginated activity log
│   └── stats.ts         → Dashboard summary statistics
└── index.ts             → Express app with all routes mounted
```

### What Is a REST API?

REST (Representational State Transfer) is a pattern for designing HTTP APIs.
The core idea: **URLs represent resources**, and **HTTP methods represent actions**:

| Method | Meaning | Example |
|--------|---------|---------|
| GET | Read data | `GET /api/items` → list all items |
| POST | Create new data | `POST /api/items` → create an item |
| PATCH | Update existing data | `PATCH /api/items/:id` → update one item |
| DELETE | Remove data | `DELETE /api/items/:id` → delete one item |

The `:id` in the URL is a **route parameter**. When someone requests
`GET /api/items/abc-123`, Express sets `req.params.id` to `"abc-123"`.

**Why PATCH and not PUT?** PUT means "replace the entire resource." PATCH means
"update only the fields I'm sending." PATCH is more practical — if you want
to change just the fate of an item, you send `{ "fate": "SELL" }` without
resending the name, description, and every other field.

### Express Router — Organizing Routes

Instead of putting every endpoint in `index.ts`, we use Express **Router**
objects to group related routes:

```typescript
// routes/items.ts
const router = Router();
router.get('/', listItems);
router.post('/', createItem);
export default router;

// index.ts
import itemRoutes from './routes/items';
app.use('/api/items', itemRoutes);
```

When `app.use('/api/items', itemRoutes)` runs, Express prepends `/api/items`
to every route defined in that router. So `router.get('/')` becomes
`GET /api/items/` and `router.get('/:id')` becomes `GET /api/items/:id`.

This keeps each file focused on one resource. The items file doesn't need
to know about containers, and vice versa.

### Middleware — The Pipeline Pattern

Express processes each request through a **pipeline** of functions called
middleware. Each middleware can:
1. Do something with the request (read headers, validate data, check auth)
2. Call `next()` to pass to the next middleware
3. Send a response to stop the pipeline

```
Request → cors() → json() → requireAuth() → validate() → route handler → Response
```

Our middleware stack:
- **`cors()`** — Adds headers so browsers allow the admin dashboard to call the API
- **`express.json()`** — Parses the request body as JSON into `req.body`
- **`requireAuth()`** — Checks the JWT token and attaches `req.user`
- **`validate(schema)`** — Validates `req.body` against a Zod schema

If any middleware sends a response (like a 401 Unauthorized), the pipeline
stops — the route handler never runs. This is how auth is enforced: every
request must pass through `requireAuth` before reaching the actual logic.

### JWT Authentication — How It Works

JWT (JSON Web Token) is a stateless authentication mechanism. Here's the flow:

```
1. Client sends: POST /api/auth/login { email, password }
2. Server verifies password against bcrypt hash in database
3. Server creates JWT: jwt.sign({ userId, role }, SECRET)
4. Server responds: { token: "eyJhbG...", user: { ... } }

5. Client stores token (localStorage, SecureStore, etc.)

6. Client sends: GET /api/items
   Headers: { Authorization: "Bearer eyJhbG..." }
7. requireAuth middleware: jwt.verify(token, SECRET)
   → Attaches { userId, role } to req.user
8. Route handler uses req.user.userId for database queries
```

**Why "stateless"?** The server doesn't store sessions. The token itself
contains the user's ID and role, signed with a secret key. The server just
verifies the signature — no database lookup needed for auth. This makes it
easy to scale to multiple servers.

**The token structure:**
```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhYmMtMTIzIiwicm9sZSI6IkFETUlOIn0.signature
│                      │                                                      │
│  Header (algorithm)  │  Payload (userId, role, expiry)                      │  Signature
```

The payload is just Base64-encoded JSON — anyone can read it. The signature
proves it wasn't tampered with. Only the server knows the JWT_SECRET needed
to create valid signatures.

### Zod Validation — Trust Nothing from the Client

Every POST and PATCH request body is validated with **Zod** before the route
handler touches it:

```typescript
// validators/items.ts
export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  fate: z.enum(['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED']).default('UNDECIDED'),
  categoryId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  description: z.string().max(2000).nullable().optional(),
  // ...
});
```

**What Zod does:**
1. Checks that every required field is present
2. Checks that every value is the right type (string, number, etc.)
3. Applies constraints (min length, max value, regex patterns, valid UUID)
4. Applies defaults for missing optional fields
5. Returns a clean, typed object — or a list of errors

**Why validate on the server?** The admin dashboard will have its own form
validation, but that only protects against mistakes. Server validation
protects against:
- Malicious requests (someone using curl or Postman to bypass the UI)
- Bugs in the frontend that let invalid data through
- Mobile app versions that haven't been updated yet

**The `.partial()` trick:**
```typescript
export const updateItemSchema = createItemSchema.partial();
```

`.partial()` makes every field optional. For creating an item, you must provide
a name and category. For updating, you can send just `{ fate: "SELL" }` and
everything else stays the same. One schema definition, two uses.

### Route Patterns We Use

#### List with Filtering (GET /api/items)

```typescript
router.get('/', async (req, res) => {
  const { fate, categoryId, search } = req.query;
  const where = { deletedAt: null };

  if (fate) where.fate = fate;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    include: { category: true, originLocation: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(items);
});
```

Query parameters let clients filter without separate endpoints:
- `GET /api/items` — all items
- `GET /api/items?fate=KEEP` — only items being kept
- `GET /api/items?search=desk` — search by name/description
- `GET /api/items?categoryId=xxx&fate=SELL` — combine filters

The `include` option tells Prisma to JOIN related tables and nest the
results — so each item comes back with its category name and location
name embedded, not just the IDs.

#### Create with Activity Log (POST /api/items)

```typescript
router.post('/', validate(createItemSchema), async (req, res) => {
  const userId = req.user!.userId;

  const item = await prisma.item.create({
    data: { ...req.body, addedById: userId, lastModifiedById: userId },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'CREATE',
      entityType: 'Item',
      entityId: item.id,
      newValue: { name: item.name, fate: item.fate },
    },
  });

  res.status(201).json(item);
});
```

Every mutation (create, update, delete) writes to the activity log.
This gives us an audit trail — who changed what, when, and what the
previous value was. The admin dashboard will display this as a timeline.

#### Transactions (POST /api/containers)

Creating a container requires creating two records: an Item (the container
itself is a physical thing) and a Container (the metadata about capacity).
Both must succeed or both must fail:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const item = await tx.item.create({ data: { ... } });
  const container = await tx.container.create({ data: { itemId: item.id, ... } });
  return { ...container, item };
});
```

`$transaction` wraps multiple queries in a database transaction. If the
container creation fails (e.g., invalid data), the item creation is
automatically rolled back. Without transactions, you'd have an orphaned
item row with no container.

#### Safe Deletes (DELETE /api/locations)

Some resources can't be deleted if other data depends on them:

```typescript
router.delete('/:id', async (req, res) => {
  const itemCount = await prisma.item.count({
    where: { originLocationId: req.params.id, deletedAt: null },
  });

  if (itemCount > 0) {
    res.status(409).json({
      error: `Cannot delete — ${itemCount} item(s) still reference it`,
    });
    return;
  }

  await prisma.location.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
```

HTTP 409 (Conflict) tells the client: "I understood your request but it
conflicts with the current state of the data." The frontend can show this
message and suggest moving items first.

Items use **soft delete** (set `deletedAt`). Locations and categories use
**hard delete with a guard** — they can only be deleted when nothing
references them.

### HTTP Status Codes We Use

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET or PATCH |
| 201 | Created | Successful POST (new resource) |
| 204 | No Content | Successful DELETE (nothing to return) |
| 400 | Bad Request | Validation failed (Zod errors) |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist or was soft-deleted |
| 409 | Conflict | Can't delete (items reference it) or duplicate |
| 500 | Server Error | Unhandled exception (bugs) |

### The Global Error Handler

The last middleware in the pipeline catches any unhandled errors:

```typescript
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: config.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message,
  });
});
```

In development, you see the actual error message (helpful for debugging).
In production, you see a generic message (prevents leaking internal details
to attackers). The error is still logged server-side either way.

### API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Login, get JWT |
| POST | /api/auth/change-password | Yes | Change own password |
| GET | /api/auth/me | Yes | Get own profile |
| GET | /api/items | Yes | List items (filterable) |
| GET | /api/items/:id | Yes | Get single item |
| POST | /api/items | Yes | Create item |
| PATCH | /api/items/:id | Yes | Update item |
| PATCH | /api/items/:id/fate | Yes | Quick fate update |
| DELETE | /api/items/:id | Yes | Soft-delete item |
| GET | /api/containers | Yes | List containers |
| GET | /api/containers/:id | Yes | Get container + contents |
| POST | /api/containers | Yes | Create container |
| PATCH | /api/containers/:id | Yes | Update container |
| GET | /api/locations | Yes | List locations |
| GET | /api/locations/:id | Yes | Get location + items |
| POST | /api/locations | Yes | Create location |
| PATCH | /api/locations/:id | Yes | Update location |
| DELETE | /api/locations/:id | Yes | Delete location (if empty) |
| GET | /api/categories | Yes | List categories |
| GET | /api/categories/:id | Yes | Get category |
| POST | /api/categories | Yes | Create category |
| PATCH | /api/categories/:id | Yes | Update category |
| DELETE | /api/categories/:id | Yes | Delete category (if empty) |
| GET | /api/placements | Yes | List placements |
| POST | /api/placements | Yes | Place item in container |
| PATCH | /api/placements/:id/remove | Yes | Remove item from container |
| GET | /api/activity | Yes | Paginated activity log |
| GET | /api/stats | Yes | Dashboard statistics |
| GET | /api/health | No | Health check |

### What's Next

Step 4 will add image upload and QR code generation — using Multer for
file uploads and the `qrcode` library to generate scannable labels for
items and containers.

### Commands to Explore

```bash
# Start the full stack
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Test the health endpoint
curl http://localhost:3001/api/health

# Login and get a token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"james@stash.local","password":"password123"}'

# Use the token to list items (replace TOKEN with the actual token)
curl http://localhost:3001/api/items \
  -H "Authorization: Bearer TOKEN"

# Create an item
curl -X POST http://localhost:3001/api/items \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item","categoryId":"...","originLocationId":"..."}'

# Filter items by fate
curl "http://localhost:3001/api/items?fate=KEEP" \
  -H "Authorization: Bearer TOKEN"

# Get dashboard stats
curl http://localhost:3001/api/stats \
  -H "Authorization: Bearer TOKEN"
```

---

## Step 4: Image Upload & QR Code Generation

### What We Built

Photo upload for items and QR code generation for items and containers:

```
packages/backend/src/
├── middleware/
│   └── upload.ts        → Multer config (storage, file filter, size limits)
├── services/
│   └── qrcode.ts        → QR code generation (to file and to data URL)
└── routes/
    └── uploads.ts       → Photo upload/delete + QR code endpoints
```

Data is stored on disk under `DATA_PATH/`:
```
data/
├── images/              → Item photos (JPEG, PNG, WebP, HEIC)
│   ├── 1711500000000-sectional-sofa.jpg
│   └── 1711500001000-standing-desk.png
└── qrcodes/             → Generated QR code PNGs
    ├── item-abc-123.png
    └── container-xyz-456.png
```

### File Uploads — Why They're Different

Most API endpoints receive JSON. File uploads are different — you can't put
binary image data in a JSON object. Instead, the client sends the request as
**multipart/form-data**, which is the same encoding browsers use for `<form>`
elements with file inputs.

```
POST /api/items/abc-123/photo
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="photo"; filename="sofa.jpg"
Content-Type: image/jpeg

<binary image data>
------WebKitFormBoundary--
```

Express's built-in `json()` parser can't handle this format. That's where
**Multer** comes in.

### Multer — File Upload Middleware

Multer is Express middleware that parses multipart/form-data and writes
uploaded files to disk. Our configuration:

```typescript
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = config.imagesPath;   // DATA_PATH/images
    ensureDir(dir);                   // Create directory if it doesn't exist
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // 1711500000000-photo.jpg — timestamp prefix prevents name collisions
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});
```

**Three decisions we made:**

1. **Disk storage vs. memory storage.** Multer can store files in memory
   (as a Buffer) or on disk. We use disk storage because:
   - Photos can be 5-10 MB. Holding many in memory risks running out of RAM.
   - We want files to survive server restarts (they're on the filesystem).
   - The `DATA_PATH` directory is mounted as a Docker volume, so files persist
     even when containers are rebuilt.

2. **Timestamp-prefixed filenames.** If two items are both photographed as
   "photo.jpg", they'd overwrite each other. Prefixing with `Date.now()`
   (millisecond Unix timestamp) makes every filename unique. We also replace
   spaces with underscores to avoid URL-encoding headaches.

3. **File type filtering.** We only accept image formats:
   ```typescript
   const allowed = /^image\/(jpeg|png|webp|heic|heif)$/;
   ```
   Without this, someone could upload a 10 MB executable or a zip bomb.
   The check is on the MIME type, not just the extension.

**Size limit:** 10 MB per file. If exceeded, Multer returns an error which
our route handler translates to HTTP 413 (Payload Too Large).

### The Upload Flow

```
1. Mobile app: User takes a photo of their coffee table
2. App sends: POST /api/items/:id/photo (multipart/form-data)
3. Multer middleware:
   a. Validates file type (JPEG? ✓)
   b. Validates file size (< 10 MB? ✓)
   c. Writes file to DATA_PATH/images/1711500000000-coffee-table.jpg
   d. Attaches file info to req.file
4. Route handler:
   a. Verifies the item exists
   b. Deletes the old photo (if replacing)
   c. Saves relative path in database: images/1711500000000-coffee-table.jpg
   d. Returns the URL for viewing: /api/files/images/1711500000000-coffee-table.jpg
```

**Replacing photos:** When uploading a new photo for an item that already has
one, we delete the old file first. This prevents orphaned files from filling
up the disk over time.

### Static File Serving

```typescript
app.use('/api/files', express.static(path.resolve(config.dataPath)));
```

This single line makes Express serve any file under `DATA_PATH/` at the
`/api/files/` URL prefix. So `DATA_PATH/images/photo.jpg` is accessible at
`http://localhost:3001/api/files/images/photo.jpg`.

Express's `static` middleware handles:
- Setting the correct `Content-Type` header based on the file extension
- Returning 404 if the file doesn't exist
- Caching headers for browser performance
- Streaming large files without loading them entirely into memory

**Why a relative path in the database?** We store `images/photo.jpg`, not
`/home/james/stash/data/images/photo.jpg`. This makes the data portable —
when we move from the local dev machine to the Unraid server, only the
`DATA_PATH` environment variable changes. The database values stay the same.

### QR Codes — What and Why

A QR code is a 2D barcode that encodes text — in our case, a URL:

```
┌──────────────────┐
│ ██ ▄▄▄ █ █▀█ ██  │  Encodes:
│ ██ █ █ █▀▀ █ █▄  │  http://localhost:3001/api/items/abc-123
│ ██ ▀▀▀ █ ▄▀█ ██  │
│ ▄▄▄▄▄▄▄ ▄▄█ ▄▄  │  When scanned:
│ █▄▀ ▄ ▄▀▀▄▄█▄   │  → Mobile app opens item detail screen
│ ▄▄▄▄▄▄▄ █▀▄▄ ▄  │  → Browser navigates to admin dashboard
└──────────────────┘
```

**The workflow for moving day:**
1. Admin dashboard generates QR codes for all containers
2. Print them as sticker labels (future PDF generation feature)
3. Stick labels on physical boxes and totes
4. On unpacking day, scan a QR code with the mobile app
5. Instantly see what's inside without opening the box

### QR Code Generation — Two Modes

We provide QR codes in two formats:

**1. File on disk** (`POST /api/items/:id/qrcode`):
```typescript
await QRCode.toFile(filePath, url, {
  type: 'png',
  width: 300,       // 300x300 pixels — good for printing
  margin: 2,        // White border (QR readers need this)
  errorCorrectionLevel: 'M',
});
```

Saved to `DATA_PATH/qrcodes/item-abc-123.png`. Useful for batch-generating
QR codes for printing.

**2. Data URL** (`GET /api/items/:id/qrcode`):
```typescript
const dataUrl = await QRCode.toDataURL(url, { ... });
// Returns: "data:image/png;base64,iVBORw0KGgo..."
```

A data URL is a base64-encoded image embedded directly in a string. The
frontend can use it immediately in an `<img>` tag without a second HTTP
request. Useful for displaying a QR code in the UI without saving to disk.

**Error correction level 'M'** means the QR code can still be scanned even
if ~15% of it is damaged (scuffed label, partial tear). Options range from
L (7%) to H (30%) — higher correction = larger QR code. 'M' is a good
balance for printed sticker labels.

### Serving Files in Production

In development, Express serves static files directly. In production on Unraid,
the Docker setup ensures files persist:

```yaml
# docker-compose.prod.yml
volumes:
  - /mnt/user/appdata/stash:/data    # DATA_PATH → Unraid disk array
```

The `DATA_PATH` in the container maps to Unraid's disk array, so photos and
QR codes survive container rebuilds. On the Tailscale network, files are
accessible at `http://100.122.58.114:3001/api/files/images/photo.jpg`.

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/items/:id/photo | Upload item photo |
| DELETE | /api/items/:id/photo | Remove item photo |
| POST | /api/items/:id/qrcode | Generate QR code (save to disk) |
| GET | /api/items/:id/qrcode | Get QR code as data URL |
| POST | /api/containers/:id/qrcode | Generate container QR code |
| GET | /api/containers/:id/qrcode | Get container QR as data URL |
| GET | /api/files/* | Serve uploaded files (static) |

### What's Next

Step 5 will build the admin dashboard frontend — React components for
the login screen, item list with filtering, item detail/edit forms,
container management, and the dashboard with fate breakdown charts.

### Commands to Explore

```bash
# Upload a photo to an item (replace TOKEN and ITEM_ID)
curl -X POST http://localhost:3001/api/items/ITEM_ID/photo \
  -H "Authorization: Bearer TOKEN" \
  -F "photo=@/path/to/photo.jpg"

# Generate a QR code for an item
curl -X POST http://localhost:3001/api/items/ITEM_ID/qrcode \
  -H "Authorization: Bearer TOKEN"

# Get QR code as data URL (no file saved)
curl http://localhost:3001/api/items/ITEM_ID/qrcode \
  -H "Authorization: Bearer TOKEN"

# View an uploaded photo in the browser
open http://localhost:3001/api/files/images/1711500000000-photo.jpg

# View a generated QR code
open http://localhost:3001/api/files/qrcodes/item-abc-123.png

# Delete a photo
curl -X DELETE http://localhost:3001/api/items/ITEM_ID/photo \
  -H "Authorization: Bearer TOKEN"
```

---

## Step 5: Admin Dashboard Frontend

### What We Built

A complete React single-page application (SPA) with routing, authentication,
and pages for every major feature:

```
packages/admin/src/
├── lib/
│   └── api.ts               → API client (fetch wrapper with JWT)
├── context/
│   └── AuthContext.tsx        → Authentication state management
├── components/
│   ├── Layout.tsx            → Sidebar + main content shell
│   ├── ProtectedRoute.tsx    → Redirects to login if not authenticated
│   └── FateBadge.tsx         → Colored fate label component
├── pages/
│   ├── LoginPage.tsx         → Email/password login form
│   ├── DashboardPage.tsx     → Stats cards, fate bars, recent activity
│   ├── ItemListPage.tsx      → Filterable item grid with search
│   ├── ItemDetailPage.tsx    → View/edit item, photo upload, fate selector
│   ├── ItemCreatePage.tsx    → New item form
│   ├── ContainerListPage.tsx → Table of all containers with item counts
│   ├── ContainerDetailPage.tsx → Container contents, remove items
│   ├── LocationListPage.tsx  → Origin/destination room tables
│   ├── LocationDetailPage.tsx → Room detail with item list
│   ├── CategoryListPage.tsx  → Category cards with item counts
│   └── ActivityPage.tsx      → Paginated audit log table
├── styles/
│   └── globals.css           → Complete CSS (no framework needed)
└── App.tsx                   → Route definitions
```

### React Concepts in Practice

#### Components — Reusable UI Building Blocks

Every piece of UI is a **component** — a function that returns JSX (HTML-like
syntax in JavaScript). Components can be as small as a badge or as large as
an entire page:

```tsx
// Small component — reusable everywhere
export function FateBadge({ fate }: { fate: string }) {
  return <span className="fate-badge" style={{ color: COLORS[fate] }}>{fate}</span>;
}

// Page component — used once in the router
export function ItemListPage() {
  // State, effects, event handlers...
  return <div className="page">...</div>;
}
```

**Props** are how data flows down. `{ fate }` is a prop — the parent decides
what fate to display, the FateBadge just renders it.

#### useState — Reactive State

```tsx
const [items, setItems] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
```

`useState` creates a value + a setter function. When you call `setItems(newData)`,
React automatically re-renders the component with the new value. You never
manually update the DOM — you update state, React handles the rest.

**Why `useState(true)` for loading?** We start in a loading state, fetch data,
then set loading to false. This pattern shows a spinner while waiting.

#### useEffect — Side Effects

```tsx
useEffect(() => {
  api.items.list(params)
    .then(setItems)
    .finally(() => setLoading(false));
}, [currentFate, currentSearch]);
```

`useEffect` runs code **after the component renders**. The dependency array
`[currentFate, currentSearch]` means: "re-run this effect whenever either
of these values changes." If the user switches the fate filter, the effect
fires again and fetches new data.

**Without the dependency array?** The effect would run on every render —
infinite loop of fetch → render → fetch → render.

#### React Router — Client-Side Navigation

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/items" element={<ItemListPage />} />
    <Route path="/items/:id" element={<ItemDetailPage />} />
  </Route>
</Routes>
```

When you click a `<Link to="/items">`, React Router:
1. Updates the browser URL (without a full page reload)
2. Matches the new URL against the route definitions
3. Renders the matching component

**Nested routes:** The Layout wraps all protected routes. It renders the
sidebar and a `<Outlet />` component. The Outlet is replaced by whichever
child route matches:

```
/items     →  Layout > Outlet=ItemListPage
/items/123 →  Layout > Outlet=ItemDetailPage
/login     →  LoginPage (no Layout wrapper)
```

**Route parameters:** `/items/:id` captures the ID from the URL. Inside the
component, `useParams()` returns `{ id: "abc-123" }`.

### Authentication Pattern

The auth flow uses React Context — a way to share state across many components
without passing props through every level:

```
AuthProvider (wraps entire app)
  ├── LoginPage (calls login())
  ├── ProtectedRoute (reads user, redirects if null)
  └── Layout
       └── Sidebar (shows user.name, calls logout())
            └── DashboardPage (API calls use stored token)
```

**On app load:**
1. AuthProvider checks localStorage for an existing JWT
2. If found, calls `GET /api/auth/me` to validate it
3. If valid → user is set, protected routes render
4. If invalid → token cleared, user sees login page

**On login:**
1. LoginPage calls `api.auth.login(email, password)`
2. API client receives `{ token, user }` response
3. Token saved to localStorage, user set in context
4. React Router navigates to dashboard

**On logout:**
1. Token cleared from localStorage
2. User set to null in context
3. ProtectedRoute detects null user → redirects to login

### The API Client Pattern

```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) throw new ApiError(data.error, res.status);
  return data;
}
```

**Why a wrapper instead of raw fetch?**
1. Automatically adds the JWT token to every request
2. Automatically parses JSON responses
3. Throws typed errors that components can catch
4. Centralizes the base URL (`/api`)

**The Vite proxy:** In development, `vite.config.ts` proxies `/api/*` requests
to `http://localhost:3001`. The browser thinks it's talking to the same origin
(port 3002), but Vite forwards the request to the backend (port 3001). This
avoids CORS issues during development.

In production, nginx does the same proxying (see `nginx.conf`).

### URL-Based Filtering

The item list uses URL search params for filtering:

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const currentFate = searchParams.get('fate') || 'ALL';

function setFate(fate: string) {
  const params = new URLSearchParams(searchParams);
  if (fate === 'ALL') params.delete('fate');
  else params.set('fate', fate);
  setSearchParams(params);
}
```

**Why URL params instead of component state?**
1. **Shareable** — You can share `http://localhost:3002/items?fate=SELL`
   and the recipient sees the same filtered view
2. **Bookmarkable** — Save a filter to come back to later
3. **Browser back button** — Changing filters updates the URL, so "back"
   goes to the previous filter instead of the previous page

### CSS Architecture — No Framework

We use a single `globals.css` file with plain CSS instead of a framework like
Tailwind. For a small admin dashboard with ~10 pages, this is simpler:

- Class names follow BEM-ish conventions (`.item-card`, `.item-card-header`)
- Layout uses CSS Grid and Flexbox
- Subtle transitions for hover effects and page loads
- Responsive-ready with `grid-template-columns: repeat(auto-fill, minmax(...))`

**Why not Tailwind?** Tailwind is great for larger teams and design systems.
For this project, a 350-line CSS file is easier to read and modify than
hundreds of utility classes scattered across JSX.

### What's Next

Step 6 will add the Claude LLM integration for price estimation — when an
item is marked as SELL, the app can ask Claude to suggest a selling price,
recommend platforms (Facebook Marketplace, OfferUp, etc.), and explain its
rationale.

### Commands to Explore

```bash
# Start the full stack (with hot reload on both frontend and backend)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Open the admin dashboard
open http://localhost:3002

# Login with: james@stash.local / password123

# Or run the frontend outside Docker (for faster hot reload)
cd packages/admin && npm run dev
# Opens at http://localhost:3002, proxies /api to :3001
```

---

## Step 6: Claude LLM Integration — AI Price Estimation

### What We Built

A pricing service that calls the Claude API to estimate selling prices:

```
packages/backend/src/
├── services/
│   └── pricing.ts       → Claude API integration, prompt, response parsing
└── routes/
    └── pricing.ts       → POST/GET /api/items/:id/price-estimate

packages/admin/src/
├── lib/api.ts           → Added getPriceEstimate, requestPriceEstimate
└── pages/
    └── ItemDetailPage.tsx → AI Price Estimate card in sidebar
```

### What Is an LLM API?

An LLM (Large Language Model) like Claude is a program that generates text
based on a prompt. The API lets you send text to Claude and get text back —
programmatically, from your backend code, without any browser or chat UI.

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: 'sk-ant-...' });

const message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'How much is a used Herman Miller Aeron worth?' }
  ],
});
```

The response contains Claude's text in `message.content[0].text`. Just like
chatting with Claude, but in code.

### The Pricing Prompt

The key to getting useful results from an LLM is the **prompt** — the
instructions you send. Our pricing prompt does several things:

```typescript
const prompt = `You are helping someone sell household items during a
cross-country move. Based on the item details below, provide a realistic
selling price for the US secondhand market (2026).

${details}

Respond with ONLY a JSON object (no markdown, no code fences) in this
exact format:
{
  "suggestedPrice": <number>,
  "rationale": "<2-3 sentences>",
  "platforms": ["<best>", "<second>", "<third>"]
}`;
```

**Prompt design decisions:**

1. **Context:** "helping someone sell during a cross-country move" — gives
   Claude the right frame. Moving sales are time-sensitive, which affects
   pricing strategy.

2. **Details:** We include name, description, category, condition, dimensions,
   weight, and the owner's own estimate (if any). More context = better prices.

3. **Structured output:** "Respond with ONLY a JSON object" — we need to
   parse the response programmatically. Without this instruction, Claude
   might return conversational text like "I'd suggest around $150..."

4. **Format enforcement:** The exact JSON format with field names means we
   can `JSON.parse()` the response and know what to expect.

5. **Calibration:** "Used items typically sell for 20-50% of retail" — this
   grounds Claude's estimates in reality. Without it, LLMs tend to estimate
   closer to retail prices.

### Parsing the Response

Claude returns text, not structured data. We need to parse it:

```typescript
const textBlock = message.content.find((block) => block.type === 'text');
let estimate: PriceEstimate;

try {
  estimate = JSON.parse(textBlock.text);
} catch {
  throw new Error(`Failed to parse Claude response: ${textBlock.text}`);
}

// Validate the shape
if (
  typeof estimate.suggestedPrice !== 'number' ||
  typeof estimate.rationale !== 'string' ||
  !Array.isArray(estimate.platforms)
) {
  throw new Error('Invalid response shape from Claude');
}
```

**Why all the error handling?** LLMs are probabilistic — they usually follow
instructions, but sometimes they:
- Add markdown code fences around the JSON (`\`\`\`json ... \`\`\``)
- Include extra text before/after the JSON
- Return slightly different field names
- Return a string instead of a number for the price

Our code handles the common case (clean JSON) and throws clear errors for
edge cases so we can debug. In production, you might add retry logic or
more flexible parsing.

### Caching Results in the Database

We store Claude's response in the item record:

```prisma
model Item {
  llmPriceSuggestion    Float?
  llmPriceRationale     String?
  llmPricePlatforms     String[]
  llmPriceGeneratedAt   DateTime?
}
```

**Why cache?** Each Claude API call takes 1-3 seconds and costs money. If
you view the same item 10 times, you don't want to call Claude 10 times.
The GET endpoint returns the stored estimate; the POST endpoint generates
a fresh one.

The `llmPriceGeneratedAt` timestamp lets the UI show when the estimate was
made. If the item's condition or description changes significantly, the
user can click "Refresh Estimate" to get an updated price.

### API Key Management

```typescript
// config.ts
anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

// pricing.ts route
if (!config.anthropicApiKey) {
  res.status(503).json({
    error: 'Price estimation unavailable — ANTHROPIC_API_KEY not configured',
  });
  return;
}
```

The API key is stored in the environment, never in code. If it's not set,
the endpoint returns a 503 (Service Unavailable) with a clear message.
This means:
- Dev machines without the key can still run the rest of the app
- The key isn't committed to Git
- Different environments can use different keys (dev vs prod)

### The Frontend Integration

The item detail page has an "AI Price Estimate" card in the sidebar:

```
┌────────────────────────┐
│ AI Price Estimate      │
│                        │
│ $150                   │  ← Big green number
│                        │
│ This mid-century       │  ← Claude's rationale
│ walnut coffee table    │
│ in fair condition...   │
│                        │
│ Facebook Marketplace   │  ← Platform tags
│ OfferUp               │
│ Craigslist            │
│                        │
│ Generated 3/27/2026   │
│ [Refresh Estimate]    │
└────────────────────────┘
```

The UI flow:
1. Page loads → GET `/api/items/:id/price-estimate`
2. If no estimate exists → show "Get Price Estimate" button
3. User clicks → POST `/api/items/:id/price-estimate`
4. Loading state: "Asking Claude..." (1-3 seconds)
5. Response received → show price, rationale, platforms
6. "Refresh Estimate" button available for re-generation

### Cost & Performance Considerations

- **Model choice:** We use `claude-sonnet-4-6` — fast and cheap for
  structured data tasks. Opus would be overkill for pricing.
- **Max tokens:** 1024 is plenty for a JSON response. Lower = faster + cheaper.
- **No streaming:** We wait for the full response because we need complete
  JSON to parse. Streaming would show partial JSON which isn't useful.
- **One call per item:** The prompt includes all item details in one message.
  No multi-turn conversation needed.
- **Approximate cost:** ~$0.003 per estimate (varies by item description length).

### What's Next

Step 7 will add the mobile app with React Native / Expo — camera integration
for photographing items, QR code scanning, and offline-first data sync.

### Commands to Explore

```bash
# Set your API key (add to .env)
echo 'ANTHROPIC_API_KEY=sk-ant-your-key-here' >> .env

# Request a price estimate via curl
curl -X POST http://localhost:3001/api/items/ITEM_ID/price-estimate \
  -H "Authorization: Bearer TOKEN"

# Get stored estimate
curl http://localhost:3001/api/items/ITEM_ID/price-estimate \
  -H "Authorization: Bearer TOKEN"

# Or use the admin dashboard:
# Navigate to any item → sidebar → "Get Price Estimate" button
```

---

## Step 7: React Native Mobile App

### What We Built

A cross-platform mobile app (iOS + Android) using React Native and Expo:

```
packages/mobile/
├── App.tsx                        → Root: navigation, auth provider
├── src/
│   ├── lib/api.ts                → API client (SecureStore for tokens)
│   ├── context/AuthContext.tsx    → Auth state with SecureStore persistence
│   ├── components/
│   │   └── FateBadge.tsx         → Colored fate label (same as admin)
│   └── screens/
│       ├── LoginScreen.tsx       → Email/password login
│       ├── ItemListScreen.tsx    → Card list with search, fate filter, pull-to-refresh
│       ├── ItemDetailScreen.tsx  → Full item view, camera, fate selector, AI pricing
│       ├── AddItemScreen.tsx     → Create item form with chip selectors
│       ├── ScanScreen.tsx        → Camera-based QR code scanner
│       └── SettingsScreen.tsx    → Account info, server URL, logout
└── package.json                  → expo, react-navigation, expo-camera, etc.
```

### React Native vs React (Web)

React Native uses the same React concepts (components, props, state, effects)
but renders **native UI components** instead of HTML:

| Web (React) | Mobile (React Native) |
|------------|----------------------|
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<TouchableOpacity>` |
| `<img>` | `<Image>` |
| `<ul>` + `<li>` | `<FlatList>` |
| CSS files | `StyleSheet.create()` |

**Why React Native?** One codebase, two platforms. The same code runs on
iPhone and Android. Expo adds a layer that handles native APIs (camera,
secure storage, etc.) without needing Xcode or Android Studio installed.

### Expo — The React Native Toolkit

Expo provides:
- **Expo Go** — An app you install on your phone to run dev builds instantly.
  No compiling, no app store. Change code, shake phone, see the update.
- **expo-camera** — Access the device camera for photos and QR scanning
- **expo-image-picker** — Take or select photos with built-in UI
- **expo-secure-store** — Encrypted key-value storage (for JWT tokens)

**Expo Go vs. native builds:** During development, you run the app through
Expo Go (faster iteration). For production, Expo can build standalone `.ipa`
and `.apk` files that install like regular apps.

### Navigation — Tabs + Stack

Mobile apps use a different navigation model than web:

```
App
├── Login Screen (shown if not authenticated)
└── Main Tabs (shown if authenticated)
    ├── Items Tab
    │   ├── Item List (default)
    │   ├── Item Detail (push)
    │   └── Add Item (push)
    ├── Scan Tab (camera)
    └── Settings Tab
```

**Bottom tabs** are the primary navigation — the user taps between Items,
Scan, and Settings. Within the Items tab, screens are **stacked**: tapping
an item pushes the detail screen on top, with a back arrow to return.

```typescript
// Tab navigator — persistent bar at the bottom
const Tab = createBottomTabNavigator();

// Stack navigator — screens push/pop on top of each other
const Stack = createNativeStackNavigator();

// Items tab has its own stack of screens
function ItemsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ItemList" component={ItemListScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="AddItem" component={AddItemScreen} />
    </Stack.Navigator>
  );
}
```

### SecureStore vs localStorage

On the web, we store the JWT in `localStorage`. On mobile, that's insecure —
any app with root access could read it. `expo-secure-store` uses the iOS
Keychain (encrypted by the device's Secure Enclave hardware):

```typescript
import * as SecureStore from 'expo-secure-store';

// Save (encrypted automatically)
await SecureStore.setItemAsync('stash_token', token);

// Read
const token = await SecureStore.getItemAsync('stash_token');

// Delete
await SecureStore.deleteItemAsync('stash_token');
```

Note that these are all **async** operations (unlike `localStorage.setItem`
which is synchronous). This is because the encryption/decryption happens on
a separate thread.

### Camera and Image Picker

Two ways to get a photo on the item detail screen:

**1. Take a new photo:**
```typescript
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,  // 80% quality — good balance of size vs clarity
});
```

**2. Choose from photo library:**
```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
});
```

Both return a `result.assets[0].uri` — a local file path like
`file:///var/mobile/.../photo.jpg`. We upload this to the server
using FormData, the same way the admin dashboard does.

**Permission handling:** iOS requires explicit permission before accessing
the camera. Expo handles the permission dialog automatically — the first
time the user taps "Take Photo", iOS shows "Stash would like to access
the camera" with Allow/Don't Allow buttons.

### QR Code Scanning

```typescript
<CameraView
  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
  onBarcodeScanned={handleBarCodeScanned}
/>
```

The camera continuously scans for QR codes. When one is detected, we
parse the URL to extract the item or container ID:

```typescript
function handleBarCodeScanned({ data }) {
  const itemMatch = data.match(/\/items\/([a-f0-9-]+)/);
  if (itemMatch) {
    navigation.navigate('ItemDetail', { id: itemMatch[1] });
  }
}
```

The QR codes from Step 4 encode URLs like `http://server/api/items/abc-123`.
We extract the UUID with a regex and navigate directly to that item's
detail screen. Scan a box label → instantly see what's inside.

### FlatList — Efficient Long Lists

Mobile can't render hundreds of DOM elements like a browser. `FlatList`
is React Native's virtualized list — it only renders the items currently
visible on screen, recycling components as you scroll:

```typescript
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemCard item={item} />}
  refreshControl={<RefreshControl onRefresh={handleRefresh} />}
/>
```

**Pull-to-refresh:** The `RefreshControl` adds the iOS pull-down-to-refresh
gesture automatically. When the user pulls down, `handleRefresh` fires and
re-fetches from the API.

### StyleSheet — CSS for Native

```typescript
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
});
```

React Native doesn't use CSS files. Instead, styles are JavaScript objects
passed to a `style` prop. The syntax is similar to CSS but uses camelCase
(`backgroundColor` not `background-color`) and numbers for pixel values.

`StyleSheet.create()` validates and optimizes the styles at creation time
rather than on every render.

### Server URL Configuration

The mobile app needs to know where the backend is. Unlike the admin dashboard
(which uses a Vite proxy), the mobile app connects directly:

```typescript
// Default: Tailscale IP for remote access
let baseUrl = 'http://100.122.58.114:3001/api';

// Changeable in Settings screen
export function setBaseUrl(url: string): void { ... }
```

The Settings screen lets the user change the server URL. This is useful for:
- **Home WiFi**: `http://192.168.1.153:3001`
- **Tailscale**: `http://100.122.58.114:3001`
- **Proxy**: `https://stash-api.shottsserver.com`

### What's Next

Step 8 will add WatermelonDB for offline-first data sync — so the mobile
app works even without internet, queuing changes for later upload.

### Commands to Explore

```bash
# Install mobile dependencies
cd packages/mobile && npm install

# Start the Expo dev server
npx expo start

# Scan the QR code with Expo Go on your phone
# Or press 'i' for iOS simulator, 'a' for Android emulator

# The app connects to your backend at the configured URL
# Make sure the backend is running (docker compose up)
```

---

## Step 8: WatermelonDB — Offline-First Data Sync

### What We Built

A local SQLite database on the phone that syncs with the server, plus
the server-side endpoints to support the sync protocol:

```
packages/mobile/src/db/
├── schema.ts              → WatermelonDB table definitions
├── models/
│   ├── Item.ts           → Item model with decorated fields
│   ├── Container.ts      → Container model
│   ├── Location.ts       → Location model
│   └── Category.ts       → Category model
├── index.ts              → Database initialization
└── sync.ts               → Pull/push sync with server

packages/mobile/src/context/
└── SyncContext.tsx         → Sync state management (status, last synced, errors)

packages/mobile/src/components/
└── SyncIndicator.tsx      → Visual sync status (dot + label)

packages/backend/src/routes/
└── sync.ts                → POST /api/sync/pull and /api/sync/push
```

### What Is "Offline-First"?

Most apps stop working without internet — they show a spinner and wait.
An **offline-first** app stores data locally and works immediately, syncing
with the server when a connection is available.

```
ONLINE-FIRST (typical web app):
  User taps "Items" → API request → wait → show data
  No internet → spinner → nothing works

OFFLINE-FIRST (Stash mobile):
  User taps "Items" → read local SQLite → show data instantly
  Background: sync local ↔ server when connected
  No internet → still works, changes queued
```

This is critical for Stash because:
- You might be in the basement, garage, or backyard with weak signal
- During moving day, WiFi might be disconnected
- The phone should be fast — no waiting for network round-trips

### WatermelonDB — Why Not Just SQLite?

WatermelonDB is a layer on top of SQLite that adds:
1. **Lazy loading** — Records aren't loaded until accessed. A list of 1,000
   items only loads the ~10 currently visible on screen.
2. **Observable queries** — When a record changes, any component showing it
   automatically re-renders. No manual refreshing.
3. **Built-in sync** — The `synchronize()` function handles the pull/push
   protocol, conflict detection, and marking records as synced.

### The Schema — Local Mirror of the Server

```typescript
tableSchema({
  name: 'items',
  columns: [
    { name: 'server_id', type: 'string' },    // The server's UUID
    { name: 'name', type: 'string' },
    { name: 'fate', type: 'string' },
    { name: 'category_name', type: 'string', isOptional: true },
    // ...
  ],
})
```

**Key differences from the server schema:**
- **Denormalized:** We store `category_name` and `origin_location_name`
  directly on the item (instead of just IDs). This avoids JOINs in SQLite
  and means the item card can display everything without extra queries.
- **`server_id`:** Maps to the PostgreSQL UUID. WatermelonDB generates its
  own local IDs for records created offline.
- **`_status` and `_changed`:** Hidden columns managed by WatermelonDB's
  sync engine — they track whether a record is `synced`, `created`,
  `updated`, or `deleted` locally.

### Models — Decorated Classes

```typescript
import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class Item extends Model {
  static table = 'items';

  @field('server_id') serverId!: string;
  @text('name') name!: string;
  @field('fate') fate!: string;
  @date('created_at') createdAt!: Date;
}
```

**Decorators** (`@field`, `@text`, `@date`) define how each property maps
to a database column. They're TypeScript syntax that adds metadata to class
properties — similar to Python decorators or Java annotations.

- `@field` — Basic column (string, number, boolean)
- `@text` — String with special sanitization (trims whitespace)
- `@date` — Converts between JavaScript Date and integer timestamp
- `@readonly` — Prevents writes after creation

### The Sync Protocol

WatermelonDB uses a **pull-then-push** sync protocol:

```
PULL (server → phone):
1. Phone sends: { lastPulledAt: 1711500000000 }    // "give me changes since this time"
2. Server queries: WHERE updatedAt > timestamp
3. Server responds: {
     changes: {
       items: { created: [...], updated: [...], deleted: ['id1', 'id2'] },
       containers: { created: [...], updated: [...], deleted: [] },
     },
     timestamp: 1711500060000    // "you're now synced up to this time"
   }
4. WatermelonDB applies changes to local SQLite

PUSH (phone → server):
1. WatermelonDB collects locally changed records (_status != 'synced')
2. Phone sends: { changes: { items: { created: [...], updated: [...], deleted: [...] } } }
3. Server applies changes to PostgreSQL
4. WatermelonDB marks local records as synced
```

**First sync:** `lastPulledAt` is `null`, so the server returns everything.
Subsequent syncs only transfer what changed since the last timestamp.

### The Server Sync Endpoints

```typescript
// POST /api/sync/pull
router.post('/pull', async (req, res) => {
  const since = lastPulledAt ? new Date(lastPulledAt) : new Date(0);

  const changedItems = await prisma.item.findMany({
    where: { updatedAt: { gt: since } },
    include: { category: true, originLocation: true },
  });

  // Separate into created vs updated vs deleted
  const isFirstSync = !lastPulledAt;
  const created = isFirstSync ? active : active.filter(i => i.createdAt > since);
  const updated = isFirstSync ? [] : active.filter(i => i.createdAt <= since);
  const deleted = changedItems.filter(i => i.deletedAt).map(i => i.id);

  res.json({ changes: { items: { created, updated, deleted } }, timestamp });
});
```

**Why separate created/updated/deleted?** WatermelonDB needs to know:
- **Created**: INSERT into local SQLite
- **Updated**: UPDATE existing local record
- **Deleted**: DELETE from local SQLite

If we sent all records as "created," WatermelonDB would try to INSERT a
record that already exists locally and fail.

### The Sync Context — Managing UI State

```typescript
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const { status, lastSynced, error, sync } = useSync();
```

The SyncContext wraps the sync function with UI-friendly state:
- `idle` — Ready to sync (gray dot)
- `syncing` — Sync in progress (blue spinner)
- `success` — Just synced (green dot, resets to idle after 3s)
- `error` — Sync failed (red dot + error message)

The Settings screen shows this status with a "Sync Now" button and the
last sync timestamp.

### Expo Dev Build Requirement

WatermelonDB includes native (C++) code for SQLite performance. This means
it doesn't work with Expo Go (which can only run JavaScript). To use
WatermelonDB, you need an **Expo dev build**:

```bash
# One-time: create a custom dev build
npx expo prebuild
npx expo run:ios    # or run:android
```

This compiles the native modules into a custom app binary. After that,
the development experience is the same — hot reload, Metro bundler, etc.

Until the dev build is set up, the app falls back to direct API calls
(which still work perfectly — just without offline support).

### What's Next

Step 9 will add Three.js 3D visualization — a wireframe container view
showing items as colored blocks inside, with volume fill percentage and
weight indicators.

### Commands to Explore

```bash
# Trigger a sync from the command line
curl -X POST http://localhost:3001/api/sync/pull \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lastPulledAt": null}'

# See what changes exist since a timestamp
curl -X POST http://localhost:3001/api/sync/pull \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lastPulledAt": 1711500000000}'

# In the mobile app: Settings tab → Sync Now button
```

---

## Step 9: Three.js 3D Container Visualization

### What We Built

An interactive 3D view that shows what's inside a container — items
rendered as colored blocks (colored by fate), inside a wireframe box,
with volume fill percentage and weight overlays:

```
packages/backend/
├── public/
│   └── container-3d.html       → Standalone Three.js renderer (HTML + JS)
└── src/routes/
    └── container3d.ts          → GET /api/containers/:id/3d (data endpoint)

packages/admin/src/pages/
└── ContainerDetailPage.tsx     → Embeds 3D view as iframe

packages/mobile/src/screens/
└── Container3DScreen.tsx       → Loads 3D view in WebView
```

### One Renderer, Two Platforms

The 3D visualization is a standalone HTML file (`container-3d.html`) that:
1. Loads Three.js from a CDN
2. Creates a scene with a wireframe box and colored item blocks
3. Receives container data via `postMessage`
4. Works in both an `<iframe>` (admin) and a `<WebView>` (mobile)

**Why a standalone HTML file?** Three.js can be bundled into a React app, but
that adds 500KB+ to the bundle and complicates the build. By keeping it as
a separate HTML file served by the backend, both platforms use the same
renderer with zero build config.

### Three.js — The Core Concepts

Three.js renders 3D scenes using WebGL (the browser's GPU-accelerated
graphics API). Every 3D scene needs three things:

```javascript
const scene = new THREE.Scene();           // The world
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000); // The eye
const renderer = new THREE.WebGLRenderer(); // The painter

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

**Scene** — The container for all 3D objects. Like a `<div>` but in 3D space.
**Camera** — Where you're looking from. PerspectiveCamera mimics human vision
(distant objects appear smaller).
**Renderer** — Draws the scene to a `<canvas>` element 60 times per second.

### Building the Container Scene

**Wireframe box** (the container walls):
```javascript
const boxGeo = new THREE.BoxGeometry(length, height, width);
const wireframe = new THREE.LineSegments(
  new THREE.EdgesGeometry(boxGeo),       // Only the edges, not the faces
  new THREE.LineBasicMaterial({ color: 0x475569 })
);
```

`EdgesGeometry` extracts just the 12 edges of the box — so you can see
through the walls to the items inside. A solid box would hide everything.

**Item blocks** (colored by fate):
```javascript
const blockGeo = new THREE.BoxGeometry(itemL, itemH, itemW);
const blockMat = new THREE.MeshPhongMaterial({
  color: FATE_COLORS[item.fate],
  transparent: true,
  opacity: 0.85,
});
const block = new THREE.Mesh(blockGeo, blockMat);
```

`MeshPhongMaterial` reacts to lighting (shiny highlights, shadows) — which
makes the blocks look 3D rather than flat. The slight transparency lets you
see overlapping items.

**Orbit controls** — Click and drag to rotate, scroll to zoom:
```javascript
const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true;     // Slowly spin when idle
controls.autoRotateSpeed = 0.8; // One rotation every ~45 seconds
controls.enableDamping = true;  // Smooth deceleration after dragging
```

### Scale and Placement

Real-world dimensions (95 inches) are too large for Three.js's default
coordinate system. We scale everything by 0.1:

```javascript
const scale = 0.1;  // 1 Three.js unit = 10 inches
const sL = containerLength * scale;  // 95" → 9.5 units
```

Items are stacked using a simple grid algorithm: place left-to-right,
wrap to the next row when hitting the wall, start a new layer when the
floor is full. This isn't perfect bin-packing, but it gives a visual
sense of how full the container is.

### The Data Flow

```
1. Admin clicks container → ContainerDetailPage loads
2. Page renders iframe pointing to /api/public/container-3d.html
3. Page calls GET /api/containers/:id/3d → gets dimensions + items
4. Page sends data to iframe via postMessage
5. Three.js renderer builds the 3D scene
6. User rotates/zooms with mouse
```

For mobile, the flow is identical but uses `<WebView>` and
`injectedJavaScript` instead of `<iframe>` and `postMessage`.

### Volume and Weight Overlays

The HUD shows two key metrics:
- **Volume Fill %** — Sum of all item volumes / container volume
- **Weight** — Sum of all item weights / max weight

```javascript
const fillPct = Math.round((totalVolume / containerVolume) * 100);
fillEl.textContent = `${fillPct}%`;
if (fillPct >= 85) fillEl.classList.add('warning');  // Turns orange
```

Warning at 85% volume or over the max weight — these help avoid overpacking
containers, which is especially important for U-Boxes (2,000 lb limit).

### What's Next

Step 10 will add PDF export — container manifests, QR label sheets, sell
lists, and donate lists using @react-pdf/renderer.

### Commands to Explore

```bash
# Get 3D data for a container
curl http://localhost:3001/api/containers/CONTAINER_ID/3d \
  -H "Authorization: Bearer TOKEN"

# Open the 3D viewer directly (with sample data via URL)
open "http://localhost:3001/api/public/container-3d.html"
# Then send data via browser console:
# window.postMessage(JSON.stringify({container: {...}, items: [...]}), '*')

# In the admin dashboard: navigate to any container detail page
# The 3D view loads automatically at the top
```

---

## Step 10: PDF & CSV Export

### What We Built

PDF generation using `@react-pdf/renderer` and CSV export, served as
downloadable files from the backend:

```
packages/backend/src/
├── services/pdf.ts       → 4 PDF templates (manifest, QR labels, sell list, donate list)
└── routes/exports.ts     → 5 export endpoints (4 PDF + 1 CSV)

packages/admin/src/
├── pages/ExportPage.tsx  → Export hub with download buttons
└── components/Layout.tsx → Added "Export" to sidebar nav
```

### @react-pdf/renderer — PDFs in React

`@react-pdf/renderer` lets you build PDFs using React components:

```tsx
import { Document, Page, View, Text } from '@react-pdf/renderer';

const doc = (
  <Document>
    <Page size="LETTER" style={{ padding: 40 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Container Manifest</Text>
      <View style={{ flexDirection: 'row' }}>
        <Text style={{ width: '50%' }}>Item Name</Text>
        <Text style={{ width: '50%' }}>Fate</Text>
      </View>
    </Page>
  </Document>
);

const buffer = await ReactPDF.renderToBuffer(doc);
```

**Why React for PDFs?** The same component model you already know (JSX, props,
styles) works for PDF layout. No learning a separate PDF API. The styles use
Flexbox — the same layout system as React Native and CSS.

**Server-side rendering:** Unlike browser React, `renderToBuffer()` runs on
the server and produces a binary PDF buffer. No browser, no DOM. The Express
route sends this buffer with `Content-Type: application/pdf`.

### The Four PDF Templates

**1. Container Manifest** — Print and tape to the outside of a box:
- Container label, type, dimensions, origin → destination
- Summary cards: total items, total weight / max weight
- Table: item name, category, fate (color-coded), condition, qty, dimensions

**2. QR Label Sheet** — Print and cut into stickers (2 per row):
- QR code image (from the generated PNGs on disk)
- Container label, name, origin → destination
- Cut along the card borders and stick on each box

**3. Sell List** — Hand to someone managing sales:
- All SELL items sorted alphabetically
- Your estimate vs. AI estimate for each
- Totals at the top for quick reference

**4. Donate List** — Hand to the charity truck driver:
- All DONATE items with category, room, condition, quantity
- Serves as a receipt for tax-deductible donation records

### CSV Export — Spreadsheet-Compatible

```typescript
const headers = ['Name', 'Category', 'Fate', 'Condition', ...];
const rows = items.map(item => [
  csvEscape(item.name),  // Handle commas, quotes, newlines
  item.category.name,
  item.fate,
  // ...
].join(','));

const csv = [headers.join(','), ...rows].join('\n');
```

CSV export supports the same filters as the item list (`?fate=SELL`,
`?categoryId=...`). This lets you export just sell items, just a specific
category, etc.

**`csvEscape`** wraps values in double quotes if they contain commas,
quotes, or newlines — otherwise Excel/Sheets would misparse them.

### The Download Pattern (Frontend)

```typescript
function downloadUrl(path, filename) {
  const token = localStorage.getItem('stash_token');
  fetch(`/api/export${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
}
```

**Why not a simple `<a>` link?** The export endpoints require JWT auth.
A normal link doesn't send the Authorization header. Instead, we fetch
with the token, convert the response to a Blob, create a temporary URL,
and trigger a download via a programmatic click.

### Export Endpoints

| Method | Endpoint | Output | Description |
|--------|----------|--------|-------------|
| GET | /api/export/pdf/manifest/:id | PDF | Container manifest with contents table |
| GET | /api/export/pdf/qr-labels | PDF | QR label sheet (2 per row, all containers) |
| GET | /api/export/pdf/sell-list | PDF | All SELL items with price estimates |
| GET | /api/export/pdf/donate-list | PDF | All DONATE items for charity receipt |
| GET | /api/export/csv/items | CSV | Full inventory spreadsheet (filterable) |

### What's Next

Step 11 will add CSV import with a column mapper — drag-and-drop a
spreadsheet, map its columns to Stash fields, preview the data, and
confirm the import.

### Commands to Explore

```bash
# Download a container manifest PDF
curl -o manifest.pdf http://localhost:3001/api/export/pdf/manifest/CONTAINER_ID \
  -H "Authorization: Bearer TOKEN"

# Download QR label sheet
curl -o labels.pdf http://localhost:3001/api/export/pdf/qr-labels \
  -H "Authorization: Bearer TOKEN"

# Download sell list
curl -o sell-list.pdf http://localhost:3001/api/export/pdf/sell-list \
  -H "Authorization: Bearer TOKEN"

# Download full CSV
curl -o items.csv http://localhost:3001/api/export/csv/items \
  -H "Authorization: Bearer TOKEN"

# Download filtered CSV (just sell items)
curl -o sell-items.csv "http://localhost:3001/api/export/csv/items?fate=SELL" \
  -H "Authorization: Bearer TOKEN"

# In the admin dashboard: navigate to Export page in the sidebar
```

---

## Step 11: CSV Import with Column Mapper

### What We Built

A two-phase CSV import: parse the file to preview it, then map columns
to Stash fields and execute the import:

```
packages/backend/src/
├── services/csv-import.ts   → CSV parser, field definitions, batch item creation
└── routes/imports.ts        → POST /parse (preview) and /execute (import)

packages/admin/src/
├── pages/ImportPage.tsx     → 3-step wizard: upload → map → result
└── components/Layout.tsx    → Added "Import" to sidebar nav
```

### The Two-Phase Approach

**Why not just upload and import?** Every spreadsheet is different. One might
have columns labeled "Item Name", another "Description", another "Object".
We can't know in advance which CSV column maps to which Stash field.

**Phase 1 — Parse and Preview:**
```
User drops CSV → Server parses headers + first 5 rows → returns preview
No items created yet — just a preview for the user to review
```

**Phase 2 — Map and Import:**
```
User maps CSV columns to Stash fields (Name, Category, Fate, etc.)
User confirms → Server creates items using the mapping
Server returns: { created: 47, errors: [{ row: 12, message: "..." }] }
```

### CSV Parsing — Handling Edge Cases

CSV looks simple but has many edge cases:
```
Name,Description,Price
"Coffee Table","Walnut, mid-century",150
"Bookshelf ""Billy""",from IKEA,45
```

Our parser handles:
- **Quoted fields** — Commas inside quotes are part of the value, not delimiters
- **Escaped quotes** — `""` inside a quoted field represents a literal `"`
- **Windows line endings** — `\r\n` vs `\n`
- **Empty rows** — Skipped silently

```typescript
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  if (inQuotes) {
    if (ch === '"' && next === '"') { field += '"'; i++; }
    else if (ch === '"') { inQuotes = false; }
    else { field += ch; }
  } else {
    if (ch === '"') { inQuotes = true; }
    else if (ch === ',') { current.push(field); field = ''; }
    else if (ch === '\n') { lines.push(current); current = []; field = ''; }
    // ...
  }
}
```

### Auto-Mapping — Smart Column Detection

When the CSV headers match Stash field names, we auto-map them:

```typescript
data.headers.forEach((header, idx) => {
  const normalized = header.toLowerCase().trim();
  const match = importableFields.find(
    f => f.label.toLowerCase() === normalized || f.key.toLowerCase() === normalized
  );
  if (match) autoMapping[idx] = match.key;
});
```

If your CSV has a column called "Name", it automatically maps to the Name
field. "Category" maps to Category. Unrecognized columns default to "(skip)".

This means if you export from Stash and re-import, columns map automatically.

### Name-to-ID Resolution

CSV data contains names ("Kitchen", "Furniture") but the database needs
UUIDs. The import service resolves names to IDs:

```typescript
const categories = await prisma.category.findMany();
const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

// In the import loop:
const catName = getValue('categoryName');
const categoryId = catName
  ? categoryMap.get(catName.toLowerCase()) || defaultCategoryId
  : defaultCategoryId;
```

If a category name doesn't match any existing category, it falls back to
the first category (rather than failing). Same for locations. This makes
imports forgiving — you don't need exact spelling.

### The Import UI — 3-Step Wizard

```
Step 1: UPLOAD         Step 2: MAP COLUMNS       Step 3: RESULT
┌──────────────────┐   ┌──────────────────────┐  ┌──────────────────┐
│                  │   │ CSV Col → Stash Field │  │ ✓ 47 Created     │
│  Drop CSV here   │   │ "Name"  → Name *      │  │ ✗ 3 Errors       │
│  or click to     │   │ "Desc"  → Description │  │                  │
│  browse          │   │ "Type"  → Category    │  │ Row 12: Name     │
│                  │   │ "Room"  → Origin Room │  │   is required    │
│                  │   │ "Price" → Est. Value  │  │                  │
└──────────────────┘   │                      │  │ [Import More]    │
                       │ Preview: first 5 rows │  │ [View Items]     │
                       │ [Import 50 Items]     │  └──────────────────┘
                       └──────────────────────┘
```

**Drag and drop:** The drop zone uses the HTML5 Drag and Drop API. When a
file is dragged over, the zone highlights blue. On drop, the file is read
and uploaded to the parse endpoint.

**Mapped columns highlight** in the preview table, unmapped columns are
grayed out — visual feedback for what will and won't be imported.

### Error Handling — Row-Level

The import doesn't stop on the first error. Each row is imported
independently, and errors are collected:

```typescript
for (let i = 0; i < rows.length; i++) {
  try {
    await prisma.item.create({ data: { ... } });
    created++;
  } catch (err) {
    errors.push({ row: i + 2, message: err.message }); // +2 for 1-indexed + header
  }
}
```

If row 12 is missing a name and row 35 has an invalid value, the other 48
rows still import successfully. The result shows exactly which rows failed
and why.

### What's Next

Step 12 will add the floor plan view — a static image of the house layout
with colored room zones overlaid, showing item counts per room.

### Commands to Explore

```bash
# Parse a CSV for preview
curl -X POST http://localhost:3001/api/import/csv/parse \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@inventory.csv"

# Execute an import (after mapping columns)
curl -X POST http://localhost:3001/api/import/csv/execute \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"csvText":"Name,Fate\nDesk,KEEP\nChair,SELL","mapping":{"0":"name","1":"fate"}}'

# In the admin dashboard: Import page in the sidebar
# Drag a .csv file, map columns, click Import
```

---

## Step 12: Floor Plan View

### What We Built

A visual room-by-room view of each house, showing colored room cards
grouped by floor with item counts and fate breakdown bars:

```
packages/backend/src/routes/
└── floorplan.ts              → GET /:house (room data) + PATCH /room/:id/position

packages/admin/src/pages/
└── FloorPlanPage.tsx         → Room grid with fate bars, house toggle
```

### The Floor Plan Concept

The floor plan shows your home as a grid of rooms, each room colored by
its assigned color and showing:
- **Room name** and **item count**
- **Fate bar** — a horizontal stacked bar showing the proportion of items
  in each fate (green for KEEP, orange for SELL, etc.)
- **Fate counts** — abbreviated labels (K: 5, S: 2, D: 1)

Clicking a room navigates to that location's detail page (items list).

```
┌─────────────────────────────────────────────────┐
│ MAIN FLOOR                                      │
├───────────────┬───────────────┬─────────────────┤
│ Living Room 8 │ Kitchen    12 │ Office        5 │
│ ████████░░░░  │ ██████████░░  │ ███████████░░░  │
│ K:5 S:2 U:1   │ K:10 T:2     │ K:4 S:1        │
├───────────────┼───────────────┼─────────────────┤
│ Dining Room 6 │ Garage      9 │ Guest BR      2 │
│ ░░░░██████░░  │ ███████░░░░░  │ ░░░░░░░░░░░░   │
│ S:4 D:2       │ K:5 T:3 U:1  │ D:2            │
└───────────────┴───────────────┴─────────────────┘
```

### v1 (Now) vs v2 (Future)

**v1 — Grid layout:** Rooms are displayed as cards in a CSS grid, grouped
by floor. No actual floor plan image. This works because:
- We don't have the NC property floor plan yet (TBD)
- A grid gives the same information (items per room, fate breakdown)
- Click-to-navigate works identically

**v2 — Image overlay (BACKLOG):** When the NC property is identified:
1. Upload a floor plan image to `DATA_PATH/floorplans/`
2. Use the position endpoint to drag rooms onto the image
3. Rooms render as positioned, colored overlays on top of the image
4. The `floorPlanX/Y/Width/Height` fields on Location support this

### The Data Endpoint

```typescript
// GET /api/floorplan/Colorado%20Home
router.get('/:house', async (req, res) => {
  const locations = await prisma.location.findMany({ where: { house } });

  // Group items by location and fate using Prisma groupBy
  const fateCountsRaw = await prisma.item.groupBy({
    by: ['originLocationId', 'fate'],
    where: { deletedAt: null, originLocationId: { in: locationIds } },
    _count: true,
  });
  // ...
});
```

**`groupBy`** is a Prisma feature that translates to SQL `GROUP BY`. Instead
of fetching all items and counting in JavaScript, the database does the
counting — much faster for thousands of items.

The response groups rooms by floor:
```json
{
  "house": "Colorado Home",
  "floors": [
    { "floor": "Main", "rooms": [
      { "name": "Living Room", "color": "#3B82F6", "totalItems": 8,
        "fateCounts": { "KEEP": 5, "SELL": 2, "UNDECIDED": 1 } }
    ]},
    { "floor": "Upper", "rooms": [...] }
  ]
}
```

### The House Toggle

The floor plan page has two buttons at the top: **Origin (Colorado)** and
**Destination (NC)**. This uses React state to switch between houses:

```typescript
const [house, setHouse] = useState('Colorado Home');

useEffect(() => {
  fetch(`/api/floorplan/${encodeURIComponent(house)}`)
    .then(r => r.json())
    .then(data => setFloors(data.floors));
}, [house]);
```

Switching houses re-fetches the floor plan data. Origin shows where items
are now. Destination shows where they're going (once assigned).

### The Fate Bar — A Stacked Horizontal Bar

```tsx
<div className="floor-plan-fate-bar">
  {FATE_ORDER.map(fate => {
    const count = room.fateCounts[fate] || 0;
    const pct = (count / room.totalItems) * 100;
    return (
      <div
        style={{ width: `${pct}%`, backgroundColor: FATE_COLORS[fate] }}
        title={`${fate}: ${count}`}
      />
    );
  })}
</div>
```

Each fate gets a segment proportional to its count. A room with 5 KEEP and
5 SELL items shows a bar that's half green, half orange. This gives an
at-a-glance sense of how "decided" each room is — rooms with lots of gray
(UNDECIDED) need attention.

### The Position Endpoint (for v2)

```typescript
PATCH /api/floorplan/room/:id/position
Body: { floorPlanX: 100, floorPlanY: 200, floorPlanWidth: 150, floorPlanHeight: 120 }
```

This endpoint exists now but isn't used by the v1 grid layout. When v2
adds the image overlay, rooms will be draggable onto the floor plan image,
and their positions will be saved via this endpoint.

### What's Next

Step 13 will add users management — admin CRUD for user accounts with
role assignment and password reset.

### Commands to Explore

```bash
# Get floor plan data for the origin house
curl "http://localhost:3001/api/floorplan/Colorado%20Home" \
  -H "Authorization: Bearer TOKEN"

# Get destination house data
curl "http://localhost:3001/api/floorplan/North%20Carolina%20Home" \
  -H "Authorization: Bearer TOKEN"

# In the admin dashboard: Floor Plan in the sidebar
# Toggle between Origin and Destination views
```

---

## Step 13: Users Management

### What We Built

Admin-only CRUD for user accounts with role management, password reset,
and safety guards:

```
packages/backend/src/
├── validators/users.ts    → Zod schemas (create, update, reset password)
└── routes/users.ts        → Full CRUD + reset password (admin only)

packages/admin/src/pages/
└── UsersPage.tsx          → Users table, create form, role toggle, password reset modal
```

### Role-Based Access — requireAdmin

All user management endpoints use two middleware layers:

```typescript
router.use(requireAuth, requireAdmin);
```

`requireAuth` verifies the JWT token (any logged-in user).
`requireAdmin` checks `req.user.role === 'ADMIN'` and returns 403 if not.

This means regular users can't access the Users page or any user
management API — even if they know the endpoint URLs.

### Safety Guards

User management needs more safety checks than most CRUD:

**Can't delete yourself:**
```typescript
if (req.params.id === req.user!.userId) {
  res.status(400).json({ error: 'Cannot delete your own account' });
  return;
}
```

**Can't remove the last admin:**
```typescript
if (req.body.role === 'USER' && existing.role === 'ADMIN') {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount <= 1) {
    res.status(400).json({ error: 'Cannot remove the last admin' });
    return;
  }
}
```

**Item reassignment on delete:** Users who added items can't simply be
deleted — the `addedById` foreign key would break. We reassign their items
to the admin performing the delete:
```typescript
await prisma.item.updateMany({
  where: { addedById: req.params.id },
  data: { addedById: req.user!.userId },
});
```

### Password Reset Flow

Admins can reset any user's password. The flow sets `mustChangePassword: true`
on the user record. This flag could be used by the login flow to force a
password change on next login (implemented in auth but not yet enforced
in the frontend).

```
Admin clicks "Reset PW" → modal with password input → POST /reset-password
→ bcrypt hash stored → mustChangePassword = true
→ User logs in → sees "you must change your password" (future enforcement)
```

### The Users UI

```
┌────────────────────────────────────────────────────────────┐
│ Users (2)                                    [+ Add User] │
├────────────────────────────────────────────────────────────┤
│ Name           Email                 Role  Items Actions  │
│ James          james@stash.local     ADMIN  12   [Demote] │
│                                                  [Reset]  │
│ Ashley ⚠pw     ashley@stash.local    USER   7    [Promote]│
│                                                  [Reset]  │
│                                                  [Delete] │
└────────────────────────────────────────────────────────────┘
```

- **Role badges** — Blue "ADMIN", gray "USER"
- **Warning badge** — Yellow "must change pw" if `mustChangePassword` is true
- **Promote/Demote** — Toggle between ADMIN and USER roles
- **Reset PW** — Opens a modal to set a new password
- **Delete** — Confirmation dialog, reassigns items, removes user
- **Create form** — Inline form with name, email, password, role

### User Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users with item/activity counts |
| POST | /api/users | Create user (bcrypt hash, mustChangePassword) |
| PATCH | /api/users/:id | Update name, email, or role |
| POST | /api/users/:id/reset-password | Admin resets user's password |
| DELETE | /api/users/:id | Delete user (reassigns items to admin) |

### What's Next

Step 14 will add polish — error/loading/empty states, responsive layout,
and general UI refinements.

### Commands to Explore

```bash
# List all users (admin only)
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Create a new user
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@stash.local","name":"Test","password":"password123","role":"USER"}'

# Reset a user's password
curl -X POST http://localhost:3001/api/users/USER_ID/reset-password \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"newpassword123"}'

# In the admin dashboard: Users page in the sidebar (admin only)
```

---

## Step 14: Polish — Error Handling, Responsive Layout, UI Refinements

### What We Built

Production-readiness improvements across the admin dashboard:

```
packages/admin/src/
├── components/
│   ├── ErrorBoundary.tsx   → Catches React render errors, shows recovery UI
│   ├── Spinner.tsx         → Consistent animated loading indicator
│   └── EmptyState.tsx      → Reusable card for "no data" states with action button
├── context/
│   └── ToastContext.tsx    → Toast notification system (success/error/info)
├── components/
│   └── Layout.tsx          → Responsive sidebar with mobile toggle + overlay
└── styles/
    └── globals.css         → Responsive breakpoints, toast, spinner, error boundary
```

### Error Boundaries — Catching React Crashes

When a React component throws an error during rendering, the entire app
crashes and shows a blank white screen. **Error boundaries** catch these
crashes and show a fallback UI instead:

```tsx
class ErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. <button>Go to Dashboard</button></div>;
    }
    return this.props.children;
  }
}
```

Error boundaries must be class components — React doesn't support them as
function components (a rare case where classes are still needed). They wrap
the entire app so any component crash shows the recovery UI.

**Why this matters:** Without an error boundary, a bug in one page (like the
item detail page receiving unexpected data) would crash the entire app. With
a boundary, only that page shows an error — the user can navigate away.

### Toast Notifications — Non-Blocking Feedback

Instead of `alert()` (which blocks everything and looks ugly), toasts slide
in from the right, show a message, and auto-dismiss after 4 seconds:

```typescript
const { toast } = useToast();
toast('Item created successfully', 'success');
toast('Failed to save', 'error');
toast('Sync complete', 'info');
```

Implementation uses React Context with a state array of active toasts:
```typescript
const [toasts, setToasts] = useState<Toast[]>([]);

function addToast(message, type) {
  const id = nextId++;
  setToasts(prev => [...prev, { id, type, message }]);
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 4000);
}
```

Each toast gets a unique ID so multiple toasts can stack. The auto-remove
timeout cleans them up. The slide-in animation uses CSS `@keyframes`.

### Responsive Sidebar — Mobile-Friendly

The sidebar is fixed on desktop (always visible) and hidden on mobile
(slides in from the left on toggle):

```
DESKTOP (> 768px):               MOBILE (< 768px):
┌──────┬──────────────────┐     ┌──────────────────────┐
│ Side │                  │     │ [=] Stash            │ ← mobile header
│ bar  │  Main Content    │     ├──────────────────────┤
│      │                  │     │                      │
│      │                  │     │  Main Content        │
│      │                  │     │  (full width)        │
└──────┴──────────────────┘     └──────────────────────┘
```

**How the toggle works:**
1. Mobile header (hidden on desktop via `display: none`, shown on mobile)
2. Hamburger button toggles `sidebarOpen` state
3. CSS class `sidebar-open` applies `transform: translateX(0)` (visible)
4. Dark overlay behind sidebar catches taps to close
5. Clicking a nav link closes the sidebar automatically

```css
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);  /* hidden by default */
    transition: transform 0.2s ease;
  }
  .sidebar-open {
    transform: translateX(0);  /* visible when toggled */
  }
  .main-content {
    margin-left: 0;  /* full width on mobile */
    padding-top: 64px;  /* room for mobile header */
  }
}
```

**Other responsive adjustments:**
- Stats grid: 4 columns → 2 columns on mobile
- Detail grid: 2 columns → 1 column (sidebar stacks below)
- Form rows: horizontal → vertical (inputs stack)
- Filters: horizontal → vertical
- Floor plan grid: auto-fill → single column

### Reusable Components — Spinner and EmptyState

**Spinner** — Replaces plain "Loading..." text with an animated circle:
```tsx
<Spinner text="Loading items..." />
```
The animation uses CSS `border-top-color` trick and `@keyframes spin`.

**EmptyState** — A styled card for "no data" with optional action button:
```tsx
<EmptyState
  title="No items found"
  description="Try adjusting your filters or add a new item"
  actionLabel="Add Item"
  actionTo="/items/new"
/>
```

### What's Next

Step 15 will test the Docker production build — verify that all containers
build and start correctly with the production Docker Compose configuration.

### Commands to Explore

```bash
# Test responsive layout: resize browser window below 768px
# The sidebar should collapse and show a hamburger menu

# Test error boundary: temporarily add `throw new Error('test')` to any
# component's render function — the error boundary card should appear

# Toast notifications are available via useToast() in any component
# They auto-dismiss after 4 seconds
```

---

## Steps 15-16: Docker Production Build & Unraid Deployment

### What We Built

Final deployment preparation — Dockerfile fixes, nginx configuration for
production, and comprehensive deployment documentation:

```
Fixes applied:
├── packages/backend/Dockerfile     → Added public/ directory copy for 3D viewer
├── packages/admin/nginx.conf       → Added client_max_body_size + proxy timeout
├── docker-compose.dev.yml          → Added public/ bind mount for dev
└── SETUP.md                        → Production checklist, backup, mobile setup
```

### Docker Multi-Stage Builds — What Happens on Deploy

When you run `docker compose up -d --build`, Docker builds each service
through its multi-stage Dockerfile:

**Backend build (3 stages):**
```
Stage 1 — development:
  Install ALL deps (including devDeps) → copy source → prisma generate
  Result: 500MB image with nodemon, tsx, TypeScript

Stage 2 — build:
  Run `tsc` to compile TypeScript → JavaScript
  Result: same image + dist/ folder with compiled .js files

Stage 3 — production:
  Fresh node:20-alpine → install ONLY production deps
  Copy: dist/, prisma/, public/, .prisma client
  Result: 150MB lean image, only what's needed to run
```

**Admin build (3 stages):**
```
Stage 1 — development:
  Install deps → Vite dev server
  Result: Node image with all React source

Stage 2 — build:
  Run `tsc && vite build` → optimized static HTML/JS/CSS bundle
  Result: dist/ folder with hashed assets

Stage 3 — production:
  Fresh nginx:alpine → copy dist/ and nginx.conf
  Result: 30MB image, just nginx serving static files
```

**Why this matters:** Development images are 500MB+ with all the dev tools.
Production images are 30-150MB with only compiled code. Smaller images
start faster, use less memory, and have less attack surface.

### Nginx in Production — The API Proxy

In development, Vite's built-in proxy handles `/api` requests. In production,
nginx serves the React app AND proxies API requests:

```nginx
server {
    # SPA: serve index.html for all routes (React Router handles them)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api/* to the backend container
    location /api/ {
        proxy_pass http://stash-backend:3001;
        client_max_body_size 15m;     # Photo uploads
        proxy_read_timeout 30s;       # Claude API calls
    }
}
```

**`try_files $uri $uri/ /index.html`** — This is the SPA fallback. When
someone navigates to `stash.shottsserver.com/items/abc-123`, nginx doesn't
have a file at `/items/abc-123`. Instead of returning 404, it serves
`index.html`, and React Router handles the URL on the client side.

**`client_max_body_size 15m`** — Nginx defaults to 1MB request bodies.
Without this, photo uploads over 1MB would get a 413 error from nginx
before even reaching the backend.

**`proxy_read_timeout 30s`** — Claude API price estimation calls can take
3-5 seconds. Default nginx timeout is 60s, but we set 30s explicitly as
documentation. If the timeout is too low, the client sees a 504 Gateway
Timeout while the backend is still waiting for Claude's response.

### The Production Network — shottsproxy

```yaml
# docker-compose.prod.yml
networks:
  stash_network:
    name: shottsproxy
    external: true
```

On Unraid, all proxied services share a Docker network called `shottsproxy`.
Nginx Proxy Manager runs on this network and can reach any container by
its `container_name`. When NPM gets a request for `stash.shottsserver.com`,
it forwards to `stash-admin:80` — which works because both containers are
on the same `shottsproxy` network.

**`external: true`** means Docker won't try to create this network — it
must already exist on Unraid. If it doesn't exist, `docker compose up`
will fail with a clear error.

### The Deployment Flow

```
1. Developer (archpy)
   └─ git push

2. Unraid (ShottsServer)
   ├─ ssh unraid
   ├─ cd /mnt/user/appdata/stash/repo
   ├─ git pull
   ├─ docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   │   ├─ Builds backend (3 stages) → production image
   │   ├─ Builds admin (3 stages) → nginx image
   │   └─ Starts all 3 containers on shottsproxy network
   ├─ docker compose exec stash-backend npx prisma migrate deploy
   │   └─ Applies any new database migrations
   └─ Verify: curl https://stash-api.shottsserver.com/api/health

3. Access
   ├─ Admin: https://stash.shottsserver.com
   ├─ API: https://stash-api.shottsserver.com
   ├─ Mobile: Expo Go → server URL → Tailscale IP or proxy
   └─ Database: pgAdmin → 100.122.58.114:5432 (Tailscale only)
```

### Data Persistence

Docker containers are ephemeral — rebuilding them destroys everything
inside. Data survives rebuilds because it lives in **volumes**:

```yaml
volumes:
  - /mnt/user/appdata/stash/images:/app/data/images
  - /mnt/user/appdata/stash/qrcodes:/app/data/qrcodes
  - /mnt/user/appdata/stash/postgres:/var/lib/postgresql/data
```

The left side (`/mnt/user/appdata/stash/images`) is on the Unraid disk
array — persistent. The right side (`/app/data/images`) is inside the
container — ephemeral. Docker maps one to the other, so the container
reads/writes to the Unraid disk.

### Backup Strategy

PostgreSQL backup via `pg_dump`:
```bash
docker compose exec stash-postgres \
  pg_dump -U stash stash > /mnt/user/appdata/stash/backup-$(date +%Y%m%d).sql
```

This creates a SQL dump file on Unraid's disk array. Unraid's built-in
parity and share system provides redundancy. For off-site backup, copy
the dump file to a cloud provider or another machine.

Photo and QR code files are already on the Unraid disk array and are
covered by Unraid's parity protection.

### Lessons from the First Real Build

When we first ran `docker compose up`, two issues surfaced immediately:

**1. Missing `tsconfig.base.json` in Dockerfiles:**
The shared package's `tsconfig.json` extends `../../tsconfig.base.json`.
On your local machine, the file is there. Inside the Docker build context,
we only copied `package.json` files — not the base tsconfig. Fix:
```dockerfile
COPY tsconfig.base.json ./    # Add before npm install
```

**Lesson:** Docker builds start from scratch. Every file the build needs
must be explicitly `COPY`ed. If it works locally but fails in Docker,
you're probably missing a `COPY` statement.

**2. JSX in a `.ts` file (pdf.ts → pdf.tsx):**
`@react-pdf/renderer` uses JSX syntax (`<Document>`, `<Page>`, etc.).
The file was named `pdf.ts`, but esbuild (used by tsx/nodemon) only
enables JSX parsing for `.tsx` files. The fix was simply renaming:
```
pdf.ts → pdf.tsx
```

**Lesson:** TypeScript has two file extensions: `.ts` (no JSX) and `.tsx`
(with JSX). If you use JSX syntax (`<Component />`), the file must end
in `.tsx`. This applies to both React components and any library that
uses JSX-like syntax (like @react-pdf/renderer).

**3. Running Prisma commands outside Docker:**
The seed script failed because `DATABASE_URL` pointed to `stash-postgres:5432`
(the Docker internal hostname). When running commands from your host machine,
you need to use the exposed port:
```bash
DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" npx prisma db seed
```

**Lesson:** Docker containers communicate by service name (`stash-postgres`).
Your host machine communicates by `localhost:5434` (the mapped port). The
`DATABASE_URL` in `.env` is for containers. Commands run from your terminal
need the localhost version.

### Build Complete

Congratulations — Stash is fully built! Here's what exists:

| Layer | Technology | Status |
|-------|-----------|--------|
| Backend API | Express + Prisma | 45+ endpoints |
| Admin Dashboard | React + Vite | 16 pages, responsive |
| Mobile App | React Native + Expo | 6 screens |
| Database | PostgreSQL 16 | 7 models, seeded |
| Offline Sync | WatermelonDB | Pull/push protocol |
| 3D Visualization | Three.js | Container viewer |
| AI Pricing | Claude API | Cached estimates |
| File Management | Multer + QR generation | Upload + labels |
| PDF/CSV Export | @react-pdf/renderer | 4 PDFs + CSV |
| CSV Import | Custom parser | Column mapper |
| Auth | JWT + bcrypt | Role-based |
| Deployment | Docker Compose | Dev + prod configs |

### Commands to Explore

```bash
# Test production build locally (without Unraid)
docker compose -f docker-compose.yml up -d --build
# This builds production images and starts all 3 containers

# Check all containers are running
docker ps | grep stash

# View build logs
docker compose logs stash-backend
docker compose logs stash-admin

# Test the production API
curl http://localhost:3001/api/health

# Test the production admin (served by nginx)
curl -I http://localhost:3002

# Stop production containers
docker compose down

# Full Unraid deployment
ssh unraid
cd /mnt/user/appdata/stash/repo
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec stash-backend npx prisma migrate deploy
docker compose exec stash-backend npx prisma db seed
```
