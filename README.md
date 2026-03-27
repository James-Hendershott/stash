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
| AI Pricing  | Claude API (claude-sonnet-4-6)    |
| Auth        | JWT + bcrypt                        |
| LLM         | Claude claude-haiku-4-5 (price estimates) |
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
- **ItemPlacement** — Tracks which items are in which container (with history).
- **Location** — Rooms in origin house (Colorado) and destination house (NC).
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

React 18 SPA with sidebar navigation, JWT authentication, and pages for:
- **Dashboard** — Stats overview, fate breakdown bars, recent activity
- **Items** — Search, filter by fate, card grid with photos, inline edit, photo upload
- **Containers** — 3D visualization (Three.js), contents table, place/remove items
- **Locations** — Origin/destination rooms with item lists
- **Categories** — Color-coded cards with item counts
- **Export** — PDF manifests, QR label sheets, sell/donate lists, CSV download
- **Activity Log** — Paginated audit trail

Login: `james@stash.local` / `password123`

## Mobile App

React Native + Expo app with bottom tab navigation:
- **Items** — Search, filter, card grid, tap to view/edit, camera photo capture
- **Scan** — Point camera at QR code labels to jump to items
- **Settings** — Server URL configuration, account info, logout

Supports offline-first operation with WatermelonDB — works without internet,
syncs when connected. See [IPHONE-GUIDE.md](IPHONE-GUIDE.md) for user guide.

## API

36 REST endpoints with JWT authentication. See [TEACH.md Step 3](TEACH.md) for
the full endpoint table. Quick test:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"james@stash.local","password":"password123"}'

# Use the returned token for all other requests
curl http://localhost:3001/api/items -H "Authorization: Bearer <token>"
```

## Documentation

- [SETUP.md](SETUP.md) — Local dev and Unraid production setup
- [TAILSCALE.md](TAILSCALE.md) — Remote access configuration
- [TEACH.md](TEACH.md) — Step-by-step learning notes
- [IPHONE-GUIDE.md](IPHONE-GUIDE.md) — iPhone user guide for Savanah
- [CHANGELOG.md](CHANGELOG.md) — Release history
- [BACKLOG.md](BACKLOG.md) — Future enhancements
