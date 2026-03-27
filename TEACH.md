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
