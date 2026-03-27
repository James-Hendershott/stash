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
