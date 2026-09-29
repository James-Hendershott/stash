# Changelog

All notable changes to Stash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-09-29 — Keep everything: unpack instead of prune

### Changed
- **Replaced `prisma/v2-prune.cjs` with `prisma/v2-unpack.cjs`** — keeps every item. Takes the 21 items out of the 8 retired totes; with `DELETE_EMPTY_TOTES=yes` deletes the emptied tote records; removes items listed in `REMOVE_ITEMS` only when id *and* name match. Dry-run by default; activity-logged.
- `v2-reference-data.cjs` no longer assigns categories per tote.

### Added
- `prisma/v2-item-categories.json` + `prisma/v2-item-categories.cjs` — per-item categories for all 265 non-book items (reviewed with James) and Books & Media › Books for all 431 books. Idempotent.

## [1.5.0] - 2026-09-28 — Phase 1: Find it

### Added
- `services/whereabouts.ts` — resolves item → container (→ parent container) → location path in memory (3 queries for any number of items).
- `GET /api/items` and `GET /api/items/:id` include `whereabouts` (container number + full location path + summary) and the category's parent.
- `GET /api/containers/by-number/:number`, `GET /api/containers/:id/screen` — the phone's container screen (tote + location + contents).
- `PATCH /api/containers/:id/location` — put a container at a spot (sets STORED; activity-logged).
- `GET /api/locations/tree`, `GET /api/locations/unplaced`, `GET /api/locations/:id/contents`, `POST /api/locations/tree`.
- Mobile: **Places** tab (Needs a spot + place tree), **Container** screen, **Location** screen, **Location picker** (drill down, create a spot inline).
- Mobile: `src/lib/qr.ts` — parses v2 (`/c/12`, `/i/<id>`), v1 (`/api/containers|items/<id>`), and bare `#12` codes.

### Changed
- Mobile navigation: detail screens moved to the root stack so any tab can open them.
- Mobile Items list shows whereabouts and full category path; search is debounced (300 ms); load errors are shown.
- Mobile Item detail: "Where it is" card linking to the container.

### Fixed
- Scanning a container QR now opens its contents (was a dead-end popup).
- Scanner re-arms when the Scan tab regains focus (previously ignored every scan after the first).

## [1.4.0] - 2026-09-28 — Phase 0: Foundation

### Added
- Migration `20260929000000_v2_storage_foundation` (additive): location tree, category tree, `container_models`, container number/colors/status/location/label status, item status/location/UPC/AI suggestion, `checkouts`, `notifications`, `settings`, `pg_trgm` + trigram index on item names.
- `prisma/v2-reference-data.cjs` — idempotent: 8 tote models, 23 categories + subcategories (7 v1 categories renamed in place), Blue Flax + Unit 3204 location tree (64 locations), archives v1 move rooms, numbers the 7 kept totes, fixes the April import's Miscellaneous game items.
- `prisma/v2-prune.cjs` — dry-run-by-default prune (keeps all books + 7 totes); `CONFIRM=yes` to execute; activity-logged.

### Changed
- `prisma/seed.ts` refuses to run when items exist (unless `SEED_FORCE=yes`) and applies the v2 reference data on fresh installs.
- `books.ts` looks up the top-level "Books & Media" category (names are unique per parent now); null-safety fixes in exports, floorplan, CSV import.

### Docs
- Realigned all docs with the v2 storage direction: `README.md` intro, `GUIDE.md` / `TAILSCALE.md` / `SETUP.md` / `IPHONE-GUIDE.md` (Expo login, SDK coupling, HTTPS default, Change Password), `BACKLOG.md` regrouped by spec phase.
- `CLAUDE.md`: "Start here — current direction" and "Session rules" (teach-as-you-build every change, confirm destructive ops, keep mirrors in sync); corrected stale architecture notes.
- Added `SPEC.md` (mirror of the vault's `stash-v2-spec.md`) with a phase progress checklist.
- BUILD_LOG ch. 26; LEARN ch. 16 + ADR-007.

## [1.3.0] - 2026-09-28

### Changed
- **Mobile upgraded to Expo SDK 57** (from 54) so the app opens in the current App Store Expo Go: React 19.1 → 19.2, React Native 0.81 → 0.86, all `expo-*` packages → 57.x, `babel-preset-expo` → 57 at the workspace root.
- `packages/mobile/metro.config.js`: `disableHierarchicalLookup` is now `false`. SDK 57 nests `expo-modules-core` under `expo/node_modules`, which Metro can't reach with hierarchical lookup disabled. Duplicate React is still prevented by the `resolveRequest` pin.
- Mobile default API URL is now `https://stash-api.shottsserver.com/api` (was the Tailscale IP over HTTP).
- `@expo/ngrok` added as a mobile devDependency — Expo's global-package lookup fails on this Windows setup, causing an install loop for `--tunnel`.
- Docs (README, SETUP, GUIDE, IPHONE-GUIDE, TEACH, CLAUDE.md) reconciled with the current code; vault mirrors re-synced.

### Added
- **Change Password** section in the mobile Settings screen (client-side validation, server-verified current password) and `api.auth.changePassword`.
- `scripts/reset-password.cjs` — reset a user's password by piping the script into the `stash-backend` container over SSH.

### Removed
- Top-level `splash` from `packages/mobile/app.json` (rejected by the SDK 57 config schema).

### Fixed
- `ItemDetailScreen`: `ImagePicker.MediaTypeOptions.Images` (deprecated) → `mediaTypes: ['images']`.

## [1.2.2] - 2026-04-25

### Added
- `packages/mobile/index.js` — explicit `registerRootComponent(App)` entry point. Required by Expo SDK 54 to register the React Native root component with `AppRegistry`. Without it, the app bundles successfully but throws `[Invariant Violation: "main" has not been registered]` at launch.
- `packages/mobile/metro.config.js` — Metro bundler config that solves two npm-workspaces + Expo gotchas:
  1. **Watches the workspace root** so edits to `@stash/shared` trigger Metro reloads, and includes both the mobile package's and workspace root's `node_modules` in the resolver paths.
  2. **Pins `react`, `react-native`, `react-dom`, `react/jsx-runtime`, and `scheduler` to the mobile package's own copies** via a custom `resolveRequest` hook. Prevents Metro from loading two Reacts (mobile's React 19 + admin's hoisted React 18), which manifested as `[Invariant Violation: Invalid hook call]` and `[TypeError: Cannot read property 'useContext' of null]`.
- `babel-preset-expo` added to root `package.json` devDependencies. The mobile `babel.config.js` references it but it wasn't installed at the workspace root, so `@babel/core` (hoisted) couldn't resolve it. Listing it at root forces hoisting.

### Changed
- `packages/mobile/package.json` `main` field: `App.tsx` → `index.js`. The new `index.js` calls `registerRootComponent`, then re-imports `App.tsx` as the root component.
- Vault/repo doc sync: deleted the duplicate uppercase markdown files (`IPHONE-GUIDE.md`, `GUIDE.md`, `README.md`, `SETUP.md`, `TEACH.md`) inside the obsidian project folder; canonical lowercase copies (`iphone-guide.md`, `guide.md`, `readme.md`, `setup.md`, `teach.md`) now mirror the latest repo content.

### Fixed
- `IPHONE-GUIDE.md` rewritten with actual setup steps. The original guide jumped straight to "James will share a QR code" without explaining how James generates one. New version has a Part 1 (first-time setup with `npx expo start --tunnel`, real API URLs, optional EAS Update path) and Part 2 (the original day-to-day usage content).

### Production state (2026-04-25 evening)
- `https://stash.shottsserver.com` — admin SPA, HTTP 200, Let's Encrypt SSL ✓
- `https://stash-api.shottsserver.com` — backend API, HTTP 200, `/api/health` returns OK ✓
- 697 items, 432 books, 15 containers, 212 placements, 107 in Unsorted
- 378 photo-catalog books imported via `/api/books/import-csv` with no container assignments (per user choice — they'll place books when unpacking each real box)

## [1.2.1] - 2026-04-25

### Added
- **Container codes:** auto-generated unique identifiers in the format `{PREFIX}-{NNNN}` (e.g. `T27-0012`, `BXS-0001`, `UBX-0001`). The legacy `Container.label` is now this code, immutable and unique. Friendly text moves to the associated `Item.description`.
- `TOTE_35GAL` container type with HDX 35-gal dimensions (28 × 15 × 16 internal, ~85 lbs).
- New backend service `services/container-codes.ts` with `nextContainerCode(tx, type, preferredNumber?)` and `parseLegacyLabel()` that recognizes "Tote #12", "Book Box #1", "Large Tote #01", "Bin #03", "Suitcase #1", and "Uhaul Unit ...".
- `containerLabel` column in `/api/import/csv` and `/api/books/import-csv` — when present, resolves to an existing container by exact code OR auto-creates one from a legacy label hint, placing the item in one transaction.
- 11th category `Camping & Outdoors` (forest green, tent icon).
- 2 new ORIGIN locations seeded for bulk import use cases: `In Storage / U-Box` and `Unsorted`.
- `scripts/transform-intake-csv.mjs` — converts the legacy "Tote Inventory Intake Form" Google Forms CSV into Stash's import-ready files (book-input.txt for the enrichment script + items.csv for the regular import).

### Changed
- `Container.label` now has a `UNIQUE` constraint (Prisma migration `20260425100000_container_codes`). QR codes encode this code; it never changes after creation.
- `POST /api/containers` no longer accepts a free-text label. If the caller passes a label hint with a number (e.g. "Tote #12"), that number is used as the *preferred* sequence; the actual code is auto-generated.
- `/api/books/import-csv` now uses a CSV-aware multer instance instead of the photo-only middleware (was previously rejecting CSV uploads with "File type not allowed").
- Both CSV import endpoints now return `{ created, placed, containersCreated, errors }` so the caller can see how many auto-creations happened.

### Production deploy outcome (2026-04-25)
Imported the legacy intake CSV in one shot:
- 53 books → enrichment script (52 matched OpenLibrary/Google Books, 1 unmatched) → `/api/books/import-csv` → all 53 imported with full bibliographic metadata, all placed in `BXS-0001` (Book Box #1).
- 266 non-book items → `/api/import/csv/execute` → 159 placed in 14 auto-created containers (T27-0003 / 0010 / 0011 / 0012 / 0013 / 0020 / 0021 / 0030 / 0031 / 0033, T35-0001, CST-0001 / 0003 / 0004), 107 sent to "Unsorted" with no container (stale camping bins per user instruction). Zero row-level errors.

## [1.2.0] - 2026-04-24

### Added
- Books: `BookDetails` model (1:1 with Item) — ISBN-10/13, authors, publisher, published year, edition, page count, language, binding, cover image URL, OpenLibrary/Google Books IDs, lookup confidence
- Books: `BookBinding` enum (HARDBACK / PAPERBACK / EBOOK / AUDIOBOOK / BOXED_SET / UNKNOWN)
- Books: free metadata lookup via OpenLibrary (primary) and Google Books (fallback) — no API keys, no per-call cost
- Books: `scripts/enrich-books.mjs` — Node script that reads a `Title | Authors | ISBN` text file, hits the lookup APIs, writes a fully-enriched CSV. Pure HTTP, no AI dependency
- Books: `POST /api/books/import-csv` — bulk import endpoint that creates Item + BookDetails rows and ItemPlacement rows where `containerLabel` is provided
- Books: `POST /api/books/lookup` — single-book metadata lookup (ISBN or title+author); no DB write
- Books: `PATCH /api/books/:itemId` — manual edit of an existing book's details
- Containers: `TOTE_14GAL` enum value (HDX 14-gallon tote), with HDX-spec internal dimensions (21" × 14" × 11.5", 50 lbs)
- Containers: corrected `TOTE_27GAL` dimensions to real HDX 27-gallon spec (28.3" × 18.5" × 13.6", 75 lbs)
- Containers: relabelled defaults — "U-Haul U-Box", "HDX 27-Gal Tote", "HDX 14-Gal Tote"
- Seed: `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD` env vars for setting initial passwords; placeholder + warning if unset
- Seed: 32 destination room placeholders sourced from the project's obsidian destination-room-list (17 main floor, 4 basement, 7 outbuildings, 4 property exterior) with real hex colors and TBD dimensions
- Env: `POSTGRES_DATA_PATH` separate from `DATA_PATH` so Postgres data can land on direct NVMe (`/mnt/cache/...`) while photos/QR/exports stay on the user share

### Changed
- Seed: rewritten to plant **scaffold only** — 2 real users (James as ADMIN, Savanah as USER), origin rooms, destination room template, 10 category templates. **Removed all fake items, containers, placements, and activity-log entries.**
- Seed users: real emails (`jameshendershott85@gmail.com`, `mama.shotts@gmail.com`); old `james@stash.local` / `password123` references removed from README, SETUP, TAILSCALE, CLAUDE.md, and admin LoginPage placeholder
- Docker compose: postgres volume now uses `${POSTGRES_DATA_PATH:-./data/postgres}` instead of `${DATA_PATH:-./data}/postgres`
- SETUP.md Unraid section: split `mkdir` between `/mnt/cache` (postgres) and `/mnt/user` (everything else); explains FUSE/shfs trap

### Fixed
- Backend tsconfig: enable `jsx: react-jsx` so `pdf.tsx` compiles; relax `noImplicitAny` (real null checks stay strict)
- Shared tsconfig: `composite: true` so backend's project reference resolves
- `req.params.X` cast to `string` in three routes where the latest @types/express infers `string | string[]`
- JWT signToken: cast `expiresIn` through `SignOptions['expiresIn']` for jsonwebtoken v9 typing

### Removed
- Books: `POST /api/books/from-photo` and the in-app Claude Haiku vision call (chapter 21 pivot — moved to offline workflow to keep AI cost at $0 for the bulk one-time book ingest). The in-app book-from-photo path can be added back later if useful, but the bulk path is the primary recommendation.

### Fixed
- Backend tsconfig: enable `jsx: react-jsx` so `pdf.tsx` compiles; relax `noImplicitAny` (real null checks stay strict)
- Shared tsconfig: `composite: true` so backend's project reference resolves
- Pinned `@types/express` to `^4.17.21` to match the actual Express 4 runtime; `npm overrides` enforce the same on transitive deps. Resolves the `string | string[]` flood from `@types/express@5`'s widened `ParamsDictionary`
- JWT signToken: cast `expiresIn` through `SignOptions['expiresIn']` for jsonwebtoken v9 typing
- `packages/backend/src/types/express.d.ts` — module augmentation that further narrows `ParamsDictionary` index signature back to `string`

### Known Issues
- Admin build currently fails due to a pre-existing `@types/react` / `react-router-dom` ForwardRef + `bigint` collision; tracked in BACKLOG (pin @types/react or upgrade router)
- No self-service change-password page in admin yet — admin must change passwords via the Users page (BACKLOG)
- Admin "Books → Import CSV" UI not yet built — endpoint works (curl-able from an authenticated session), the page is in BACKLOG

## [1.1.1] - 2026-04-04

### Fixed
- Mobile: removed WatermelonDB dependency (requires native build, crashes Expo Go)
- Mobile: SyncContext rewritten with SecureStore stub (offline sync re-enabled with dev build)
- Mobile: added placeholder icon.png, splash.png, adaptive-icon.png assets
- Mobile: updated @types/react to ~19.1.10, typescript to ~5.3.3 for SDK 54
- Mobile: removed @types/react-native (included in react-native 0.81+)

### Changed
- Mobile now fully works in Expo Go for development and testing
- WatermelonDB offline sync moved to BACKLOG (requires custom Expo dev build)

## [1.1.0] - 2026-04-03

### Added
- 3D container viewer: hover tooltips (item name, fate, dimensions, weight)
- 3D container viewer: click-to-select items with highlight
- 3D container viewer: drag-to-reposition items within container walls
- 3D container viewer: R key to rotate selected item 90° (swaps L/W)
- 3D container viewer: AABB collision detection — items cannot overlap
- 3D container viewer: stacking physics — items sit on top of each other automatically
- 3D container viewer: red flash + revert when overlap detected on drop/rotate
- Live 3D shape preview on Add Item page (updates as you type L/W/H)
- Shape type selector (Box, Cylinder, Sphere, L-Shape, Panel) with colored dimension lines
- Place in Container UI on item detail page (dropdown + Place/Remove buttons)
- GUIDE.md — complete user guide covering all workflows
- Root .dockerignore to exclude data/, node_modules/, .git/ from build context

### Fixed
- Location names: "Colorado Home" → "Eagle Mountain, UT", "North Carolina Home" → "NC Property — TBD"
- Vite proxy: BACKEND_HOST env var for Docker (stash-backend vs localhost)
- Docker admin port conflict: moved ports from base compose to dev/prod overrides
- Dockerfiles: added tsconfig.base.json COPY for shared package builds
- pdf.ts → pdf.tsx for JSX support with esbuild
- Form field order: shape/dimensions moved above category (adjacent to 3D preview)

## [1.0.1] - 2026-04-03

### Fixed
- Both Dockerfiles: added missing `COPY tsconfig.base.json` (shared package extends it)
- Renamed pdf.ts → pdf.tsx (esbuild requires .tsx extension for JSX syntax)
- Initial database migration generated and committed

### Added
- TEACH.md: "Lessons from the First Real Build" section (Docker COPY, .tsx extension, Prisma host)

## [1.0.0] - 2026-04-01

### Added
- Backend Dockerfile: copies public/ directory for 3D viewer in production
- Nginx: client_max_body_size 15m for photo uploads, proxy_read_timeout 30s for Claude API
- Dev compose: public/ bind mount for 3D viewer hot reload
- SETUP.md: production user creation, mobile app setup, deployment checklist, backup instructions
- TEACH.md Steps 15-16: multi-stage Docker builds, nginx production proxy, shottsproxy network, data persistence, backup strategy, full build summary

### Changed
- Version bumped to 1.0.0 — all features complete, ready for production deployment

## [0.14.0] - 2026-04-01

### Added
- ErrorBoundary component — catches React render crashes with recovery UI
- Toast notification system (success/error/info) with auto-dismiss and stacking
- Spinner component with CSS animation for consistent loading states
- EmptyState card component with optional action button/link
- Responsive sidebar: collapses on mobile (<768px), hamburger toggle, overlay backdrop
- Mobile header with app title and menu toggle
- Responsive breakpoints for stats grid, detail grid, forms, filters, floor plan
- TEACH.md Step 14: error boundaries, toast pattern, responsive sidebar, reusable components

## [0.13.0] - 2026-03-30

### Added
- Users management (admin only): list, create, update role, reset password, delete
- Zod validators for user create, update, and password reset
- Safety guards: can't delete self, can't remove last admin, item reassignment on delete
- Password reset sets mustChangePassword flag for forced change on next login
- Admin Users page with inline create form, role badges, promote/demote toggle, reset password modal
- Users nav item in admin sidebar
- TEACH.md Step 13: role-based access, safety guards, password reset flow, admin UI patterns

## [0.12.0] - 2026-03-27

### Added
- Floor plan view with room grid grouped by floor, colored by room assignment
- Stacked fate bar per room (proportional KEEP/SELL/DONATE/TRASH/UNDECIDED segments)
- House toggle (Origin Colorado / Destination NC) with live data refresh
- GET /api/floorplan/:house endpoint with Prisma groupBy for item counts per location per fate
- PATCH /api/floorplan/room/:id/position for future image overlay positioning
- Floor Plan nav item in admin sidebar
- Click room → navigate to location detail (item list for that room)
- TEACH.md Step 12: floor plan v1 grid vs v2 image overlay, Prisma groupBy, stacked bar rendering

## [0.11.0] - 2026-03-27

### Added
- CSV import with column mapper: 2-phase approach (parse preview, then map and execute)
- Custom CSV parser handling quoted fields, escaped quotes, Windows line endings
- Auto-mapping: CSV headers matching Stash field names map automatically
- Name-to-ID resolution for categories and locations during import (fuzzy, case-insensitive)
- Row-level error handling: failed rows don't block successful ones
- Import API: POST /api/import/csv/parse (preview) and /api/import/csv/execute (batch create)
- Admin Import page: 3-step wizard with drag-drop upload, column mapper dropdowns, preview table, result summary
- Import nav item in admin sidebar
- TEACH.md Step 11: two-phase import, CSV parsing edge cases, auto-mapping, name-to-ID resolution, wizard UI

## [0.10.0] - 2026-03-27

### Added
- PDF export using @react-pdf/renderer with 4 templates:
  - Container manifest (contents table, weight summary, fate colors)
  - QR label sheet (2 per row with QR images, container name, origin/destination)
  - Sell list (all SELL items with your estimate vs. AI estimate, totals)
  - Donate list (all DONATE items for charity receipt)
- CSV export for full inventory (filterable by fate, category, location)
- Export API routes: 4 PDF endpoints + 1 CSV endpoint
- Admin Export page with download buttons for all formats
- Export nav item in admin sidebar
- TEACH.md Step 10: @react-pdf/renderer, server-side PDF generation, CSV escaping, authenticated file download pattern

## [0.9.0] - 2026-03-27

### Added
- Three.js 3D container visualization with wireframe box, colored item blocks (by fate), orbit controls, and auto-rotate
- Standalone HTML renderer (container-3d.html) loaded via CDN, works in both iframe (admin) and WebView (mobile)
- GET /api/containers/:id/3d endpoint returning container dimensions and item dimensions/fates
- Admin container detail page now shows 3D view at the top with volume fill % and weight overlays
- Mobile Container3DScreen using react-native-webview to load the 3D viewer
- Public static file serving at /api/public/* for the 3D viewer HTML
- Volume fill warning at 85%, weight warning when over max
- Fate color legend in the 3D view
- TEACH.md Step 9: Three.js core concepts (scene/camera/renderer), wireframe vs solid geometry, MeshPhongMaterial, OrbitControls, scaling, postMessage data flow

## [0.8.0] - 2026-03-27

### Added
- WatermelonDB offline-first database with schema mirroring Prisma models (items, containers, locations, categories)
- WatermelonDB model classes with decorated fields (Item, Container, Location, Category)
- Pull/push sync protocol: POST /api/sync/pull and /api/sync/push backend endpoints
- Pull endpoint returns created/updated/deleted records since last sync timestamp, with denormalized category and location names
- Push endpoint applies local item creates/updates/deletes to PostgreSQL
- Sync service on mobile using WatermelonDB's synchronize() function
- SyncContext for managing sync state (idle/syncing/success/error) across the app
- SyncIndicator component (colored dot + label, tap to sync)
- Settings screen updated with offline sync status, last synced time, and Sync Now button
- TEACH.md Step 8: offline-first architecture, WatermelonDB vs SQLite, sync protocol, denormalization, Expo dev builds

## [0.7.0] - 2026-03-27

### Added
- React Native mobile app with Expo (iOS + Android)
- Bottom tab navigation (Items, Scan, Settings) with nested stack navigation
- Login screen with SecureStore JWT persistence
- Item list screen with search, fate filtering, pull-to-refresh, photo-aware cards
- Item detail screen with camera photo capture, image picker, fate selector, AI price estimate
- Add item screen with chip-based category/condition/fate/room selectors
- QR code scanner using expo-camera (auto-navigates to scanned item)
- Settings screen with configurable server URL and logout
- API client using expo-secure-store for encrypted token storage
- iPhone user guide (IPHONE-GUIDE.md) with step-by-step instructions
- TEACH.md Step 7: React Native vs React, Expo, navigation patterns, SecureStore, camera, QR scanning, FlatList, StyleSheet

## [0.6.0] - 2026-03-27

### Added
- Claude LLM integration for AI-powered price estimation on sell items
- Pricing service using @anthropic-ai/sdk (claude-sonnet-4-6 model)
- Structured prompt that returns JSON with suggested price, rationale, and platform recommendations
- Price estimate caching in database (llmPriceSuggestion, llmPriceRationale, llmPricePlatforms, llmPriceGeneratedAt)
- POST /api/items/:id/price-estimate — generate new estimate via Claude
- GET /api/items/:id/price-estimate — retrieve stored estimate
- Graceful 503 if ANTHROPIC_API_KEY not configured
- AI Price Estimate card on item detail page with price, rationale, platform tags, refresh button
- TEACH.md Step 6: LLM APIs, prompt design, JSON parsing, caching, API key management, cost considerations

## [0.5.0] - 2026-03-27

### Added
- Complete admin dashboard frontend (React 18 + Vite + React Router)
- API client with JWT token management and typed error handling
- Auth context with localStorage token persistence and auto-validation
- Login page with email/password form
- Dashboard page with stat cards (total items, containers, locations, sell total), fate breakdown bars, recent activity
- Item list page with search, fate filtering via URL params, photo-aware card grid
- Item detail page with inline editing, photo upload, fate selector, container placement history
- Item create page with category/location dropdowns, dimension inputs
- Container list/detail pages with contents table and item removal
- Location list page (origin/destination groups) and detail page with item tables
- Category list page with color-coded cards and item counts
- Activity log page with pagination
- Protected routes (redirect to login when unauthenticated)
- Sidebar navigation with active state highlighting
- FateBadge reusable component with color-coded labels
- Complete CSS (layout, forms, tables, cards, badges, responsive grid)
- TEACH.md Step 5: React concepts (components, useState, useEffect, Router), auth pattern, API client, URL filtering, CSS architecture

## [0.4.0] - 2026-03-27

### Added
- Item photo upload via Multer (JPEG, PNG, WebP, HEIC; 10 MB limit)
- Multer middleware with disk storage, timestamp-prefixed filenames, MIME type filtering
- QR code generation service (to PNG file and to base64 data URL)
- QR codes encode API URLs for items and containers (scannable on mobile)
- Upload routes: photo upload/delete, QR code generate/retrieve for items and containers
- Static file serving at /api/files/* for photos and QR codes
- TEACH.md Step 4: file uploads, Multer, multipart/form-data, QR codes, static serving

## [0.3.0] - 2026-03-27

### Added
- Complete REST API with 29 endpoints across 8 route groups
- JWT authentication middleware (login, token verification, role-based access)
- Zod request validation middleware for all POST/PATCH endpoints
- Auth routes: login, change password, get current user profile
- Item CRUD routes with search, filtering by fate/category/location, soft delete
- Container CRUD routes with transactional Item+Container creation
- Location and Category CRUD with referential integrity guards (409 on delete if referenced)
- Placement routes: place items into containers, remove with history tracking
- Activity log route with pagination (limit/offset)
- Dashboard stats route (fate breakdown, category breakdown, sell value totals)
- Global error handler (detailed errors in dev, sanitized in production)
- TEACH.md Step 3: REST APIs, Express Router, middleware pipeline, JWT auth, Zod validation, route patterns

## [0.2.0] - 2026-03-27

### Added
- Prisma schema with all database models (User, Location, Category, Item, Container, ItemPlacement, ActivityLog)
- PostgreSQL enums: Role, Condition, Fate, ShapeType, ContainerType, LocationType
- Database indexes on foreign keys and frequently filtered columns
- Seed script with realistic development data (2 users, 13 locations, 10 categories, 22 items, 3 containers, 4 placements)
- Soft delete support (deletedAt) on Items
- Cascading deletes on Container → Item and ItemPlacement → Item/Container
- TEACH.md Step 2: ORMs, Prisma schema anatomy, relations, indexes, migrations, seeding

## [0.1.0] - 2026-03-26

### Added
- Initial project scaffold
- Monorepo structure with npm workspaces (@stash/shared, @stash/backend, @stash/admin, @stash/mobile)
- Docker Compose configuration (base, dev, prod)
- Shared types, constants, and utilities
- Backend Express server with health endpoint
- Admin React app stub
- Mobile Expo app stub
- Environment configuration with DATA_PATH portability
- Project documentation (README, SETUP, TAILSCALE, TEACH)
