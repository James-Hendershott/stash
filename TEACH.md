# Stash — Learning Journal

This file is written as we build Stash, step by step. Each section explains
what was built, why decisions were made, and teaches the underlying concepts.

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
