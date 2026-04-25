# Stash

Self-hosted inventory and move management application.

Stash answers one question: **"Where is this thing?"**

Built for cataloging household items, assigning them to containers (boxes, totes, U-Box),
tracking what to Keep/Sell/Donate/Trash, and managing a full household move. After the move,
Stash becomes a permanent property inventory system.

## Architecture

```
┌─────────────────────┐         ┌──────────┐         ┌──────────────────────────────┐
│  archpy (Dev)       │         │  GitHub   │         │  ShottsServer (Unraid)       │
│  Dell Inspiron 15   │  push   │  Private  │  pull   │  Dell PowerEdge R730         │
│                     │ ──────► │  Repo     │ ──────► │  192.168.1.153 (LAN)         │
│  Arch Linux         │         │          │         │  100.122.58.114 (Tailscale)  │
│  Node.js 25.7       │         └──────────┘         │                              │
│  Docker 29.3        │                               │  Docker Containers:          │
│                     │                               │  ├─ stash-postgres (:5432)   │
│  Local dev with     │                               │  ├─ stash-backend  (:3001)   │
│  docker compose     │                               │  └─ stash-admin    (:3002)   │
└─────────────────────┘                               │                              │
                                                      │  Nginx Proxy Manager:        │
┌─────────────────────┐                               │  ├─ stash.shottsserver.com   │
│  Mobile Devices     │                               │  │  → stash-admin:3002       │
│  (iOS & Android)    │  Tailscale VPN                │  └─ stash-api.shottsserver.  │
│                     │ ─────────────────────────────► │     com → stash-backend:3001 │
│  React Native /     │                               │                              │
│  Expo app           │                               │  Data: /mnt/user/appdata/    │
└─────────────────────┘                               │        stash/               │
                                                      └──────────────────────────────┘
```

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Mobile      | React Native + Expo (SDK 51+)       |
| Admin       | React 18 + Vite                     |
| Backend     | Node.js 20 + Express                |
| Database    | PostgreSQL 16                       |
| ORM         | Prisma                              |
| Offline     | WatermelonDB                        |
| 3D          | Three.js                            |
| Validation  | Zod                                 |
| File Upload | Multer (disk storage)               |
| QR Codes    | qrcode (PNG + data URL)             |
| AI Pricing  | Claude Sonnet 4.6 (sell-price estimates — optional, 503s if no key) |
| Books lookup| OpenLibrary + Google Books (free, no API key); offline enrichment script + CSV import |
| Auth        | JWT + bcrypt                        |
| Deploy      | Docker Compose on Unraid            |
| Remote      | Tailscale                           |

## Database Models

```
User ──────┐
           ├──► Item ◄── Category
Location ──┤     │
           │     ├──► Container
           │     └──► ItemPlacement ◄── Container
           └──► ActivityLog
```

- **Item** — Anything you own. Has a fate (Keep/Sell/Donate/Trash), dimensions, condition, photos.
- **Container** — A special Item that holds other Items (U-Box, tote, box).
- **BookDetails** — A 1:1 companion to Item for books — ISBN, edition, binding, cover art URL. Auto-populated from `POST /api/books/from-photo`.
- **ItemPlacement** — Tracks which items are in which container (with history).
- **Location** — Rooms in origin house (Eagle Mountain, UT) and destination house (NC).
- **Category** — Furniture, Electronics, Kitchen, etc.
- **ActivityLog** — Audit trail of who changed what and when.

## Quick Start

```bash
# Clone and setup
git clone git@github.com:james-hendershott/stash.git
cd stash
cp .env.example .env
npm install

# Start local dev environment
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Run database migrations and seed
cd packages/backend
npx prisma migrate dev --name init
npx prisma db seed

# Browse data visually
npx prisma studio
```

See [SETUP.md](SETUP.md) for detailed local and production setup instructions.

## Access URLs

| Environment | Admin Dashboard | API |
|------------|-----------------|-----|
| Local Dev | http://localhost:3002 | http://localhost:3001 |
| LAN | http://192.168.1.153:3002 | http://192.168.1.153:3001 |
| Tailscale | http://100.122.58.114:3002 | http://100.122.58.114:3001 |
| Proxy | https://stash.shottsserver.com | https://stash-api.shottsserver.com |

## Admin Dashboard

React 18 SPA with responsive sidebar, JWT auth, error boundaries, toast notifications, and pages for:
- **Dashboard** — Stats overview, fate breakdown bars, recent activity
- **Items** — Search, filter by fate, card grid with photos, inline edit, photo upload, 3D shape preview on create
- **Containers** — Interactive 3D view (hover, select, drag, rotate, collision, stacking), contents table
- **Locations** — Origin/destination rooms with item lists
- **Floor Plan** — Visual room grid by floor with fate breakdown bars, house toggle
- **Categories** — Color-coded cards with item counts
- **Import** — Drag-drop CSV upload, column mapper, preview, batch create
- **Export** — PDF manifests, QR label sheets, sell/donate lists, CSV download
- **Users** — Admin user management (create, roles, password reset, delete)
- **Activity Log** — Paginated audit trail

Login: the admin email seeded by `prisma db seed` (see `packages/backend/prisma/seed.ts`). The initial password is a placeholder unless `SEED_ADMIN_PASSWORD` was set when the seed ran — in that case the seed output prints a warning telling you to change it via the Users page on first login.

## Mobile App

React Native + Expo app with bottom tab navigation:
- **Items** — Search, filter, card grid, tap to view/edit, camera photo capture
- **Scan** — Point camera at QR code labels to jump to items
- **Settings** — Server URL configuration, account info, logout

Runs in Expo Go for development. See [IPHONE-GUIDE.md](IPHONE-GUIDE.md) for user guide.

## Books — bulk cataloging via offline enrichment

Stash has a dedicated path for books because there are thousands of them
and typing each one is unworkable. **The AI step happens outside Stash**
in a free chat UI; the result flows in via CSV. Total cost: $0.

```
Photos → claude.ai/chatgpt.com → text list → enrich-books.mjs → CSV → admin import
   (free vision)                              (free DB lookups)        (no AI cost)
```

Three stages:
1. Take phone photos of shelves/stacks. Drop them into Claude.ai or
   ChatGPT with a paste-in prompt; copy out a `Title | Authors | ISBN`
   text list. (See `GUIDE.md` for the prompt.)
2. Run `node scripts/enrich-books.mjs books.txt books.csv` — pure Node,
   no auth, hits OpenLibrary then Google Books to enrich each row with
   ISBN-13/10, publisher, year, page count, official cover URL.
3. Open the CSV in your spreadsheet editor, add `originLocation`,
   `containerLabel`, `fate` columns, save. Upload via admin **Books →
   Import CSV**. Stash batch-creates `Item` + `BookDetails` rows and
   drops books into their containers in one transaction.

Endpoints:
- `POST /api/books/import-csv` — bulk creation from enriched CSV
- `POST /api/books/lookup` — ISBN or title+author, no DB write
- `PATCH /api/books/:itemId` — manual edit of a single book's details

Books are still Items, so they slot into the same containers, fates,
locations, QR labels, and exports as everything else — they just have a
sidecar table with their bibliographic data.

## API

39 REST endpoints with JWT authentication. See [TEACH.md Step 3](TEACH.md) for
the full endpoint table. Quick test:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<your-password>"}'

# Use the returned token for all other requests
curl http://localhost:3001/api/items -H "Authorization: Bearer <token>"
```

## Documentation

- [GUIDE.md](GUIDE.md) — Complete user guide (how to add items, containers, sell, export, etc.)
- [SETUP.md](SETUP.md) — Local dev and Unraid production setup
- [TAILSCALE.md](TAILSCALE.md) — Remote access configuration
- [TEACH.md](TEACH.md) — Step-by-step learning notes
- [IPHONE-GUIDE.md](IPHONE-GUIDE.md) — iPhone user guide for Savanah
- [CHANGELOG.md](CHANGELOG.md) — Release history
- [BACKLOG.md](BACKLOG.md) — Future enhancements
