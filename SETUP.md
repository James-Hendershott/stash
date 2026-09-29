# Stash — Setup Guide

## Section 1: Local Development

### Prerequisites
- Node.js 20+ (managed by mise)
- Docker 29+ and Docker Compose 5+
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone git@github.com:james-hendershott/stash.git
   cd stash
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Default values work for local development — no changes needed.

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start services**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```
   This starts:
   - PostgreSQL on port **5434** (mapped from internal 5432)
   - Backend API on port **3001** (with hot reload)
   - Admin dashboard on port **3002** (Vite dev server)

5. **Run database migrations**
   ```bash
   cd packages/backend
   DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" npx prisma migrate dev --name init
   ```
   This reads `prisma/schema.prisma`, generates a SQL migration file, and
   creates all tables in the local PostgreSQL container.

   > **Note:** The `DATABASE_URL` prefix is needed because Prisma runs on your
   > host machine and must connect via `localhost:5434` (the Docker-exposed port),
   > not `stash-postgres:5432` (which only works inside Docker containers).

6. **Seed the database**
   ```bash
   DATABASE_URL="postgresql://stash:stash@localhost:5434/stash" npx prisma db seed
   ```
   Populates the database with the real scaffold only: 2 users (1 admin, 1
   user), origin locations (Eagle Mountain, UT), destination room
   placeholders, and category templates. **No fake items, containers, or
   placements** — those get added through the UI. The admin user's email is
   `jameshendershott85@gmail.com`; the regular user is `mama.shotts@gmail.com`.

   Initial passwords come from the `SEED_ADMIN_PASSWORD` and
   `SEED_USER_PASSWORD` env vars — if unset, the seed uses a placeholder and
   prints a warning. **Change them via the admin Users page immediately after
   first login.**

7. **Verify**
   - Backend health: http://localhost:3001/api/health
   - Admin dashboard: http://localhost:3002 (login with the admin email and password from the seed step above)
   - Database (via Prisma Studio): `npx prisma studio` (opens http://localhost:5555)
   - API login test:
     ```bash
     curl -X POST http://localhost:3001/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"<admin-email>","password":"<your-password>"}'
     ```

8. **Test file uploads (optional)**
   ```bash
   # Upload a photo (replace TOKEN and ITEM_ID from the login/list responses)
   curl -X POST http://localhost:3001/api/items/ITEM_ID/photo \
     -H "Authorization: Bearer TOKEN" \
     -F "photo=@/path/to/any-image.jpg"

   # Generate a QR code for an item
   curl -X POST http://localhost:3001/api/items/ITEM_ID/qrcode \
     -H "Authorization: Bearer TOKEN"
   ```

### Local Data

Development data is stored in `./data/` (gitignored):
- `data/postgres/` — PostgreSQL data files
- `data/images/` — Uploaded item photos (JPEG, PNG, WebP, HEIC; 10 MB limit)
- `data/qrcodes/` — Generated QR code PNGs (300x300, error correction M)
- `data/exports/` — Generated CSV/PDF exports
- `data/floorplans/` — Floor plan images

9. **Start the mobile app (optional)**
   ```bash
   cd packages/mobile
   npm install
   npx expo login          # first time only — same account as Expo Go
   npx expo start --tunnel
   ```
   Sign in to **Expo Go** on your phone with the same Expo account, then scan
   the QR code. The project targets **Expo SDK 57**; Expo Go only runs the
   newest SDK, so upgrade the project if Expo Go reports it as incompatible
   (BUILD_LOG ch. 24). The app defaults to the production API
   (`https://stash-api.shottsserver.com`); to test against your local
   backend, set Settings → Server URL to your computer's LAN IP (e.g.
   `http://192.168.1.74:3001`). There is no offline mode.

### Stopping Services

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Add `-v` to also remove volumes (deletes all local data).

---

## Section 2: Unraid Production

### Prerequisites
- SSH access to Unraid: `ssh unraid`
- Docker and Docker Compose on Unraid
- Nginx Proxy Manager running on Unraid
- Tailscale configured on server

### Steps

1. **SSH into Unraid**
   ```bash
   ssh unraid
   ```

2. **Create appdata directories**

   The split between `/mnt/cache` and `/mnt/user` is deliberate. Postgres
   data MUST live on direct NVMe (`/mnt/cache/...`); the FUSE union path
   (`/mnt/user/...`) adds catastrophic I/O overhead for database
   containers. The repo, photos, and exports can stay on the user share.

   ```bash
   # Postgres on direct NVMe (no FUSE)
   mkdir -p /mnt/cache/appdata/stash/postgres

   # Repo + uploaded files on the user share
   mkdir -p /mnt/user/appdata/stash/{images,qrcodes,exports,floorplans,repo}
   ```

3. **Set permissions**
   ```bash
   chown -R nobody:users /mnt/cache/appdata/stash /mnt/user/appdata/stash
   chmod -R 755 /mnt/cache/appdata/stash /mnt/user/appdata/stash
   ```

4. **Clone the repository**
   ```bash
   cd /mnt/user/appdata/stash/repo
   git clone https://github.com/James-Hendershott/stash.git .
   ```

5. **Create production environment file**
   ```bash
   cp .env.example .env
   ```
   Update these values in `.env`:
   ```env
   NODE_ENV=production

   DATA_PATH=/mnt/user/appdata/stash
   POSTGRES_DATA_PATH=/mnt/cache/appdata/stash/postgres

   POSTGRES_PASSWORD=<strong-password>
   DATABASE_URL=postgresql://stash:<strong-password>@stash-postgres:5432/stash
   JWT_SECRET=<long-random-string>
   ANTHROPIC_API_KEY=<your-actual-key-or-leave-blank>
   BACKEND_URL=https://stash-api.shottsserver.com

   SEED_ADMIN_PASSWORD=<strong-initial-password-for-james>
   SEED_USER_PASSWORD=<strong-initial-password-for-savanah>
   ```

6. **Start production services**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

7. **Run database migrations**
   ```bash
   docker compose exec stash-backend npx prisma migrate deploy
   ```

8. **Seed the database**
   ```bash
   docker compose exec stash-backend npx prisma db seed
   ```

9. **Configure Nginx Proxy Manager**

   Log in to NPM admin: http://192.168.1.153:7818

   **Proxy Host 1 — Admin Dashboard:**
   - Domain: `stash.shottsserver.com`
   - Scheme: `http`
   - Forward Hostname: `stash-admin`
   - Forward Port: `80`
   - Enable SSL (Let's Encrypt)

   **Proxy Host 2 — Backend API:**
   - Domain: `stash-api.shottsserver.com`
   - Scheme: `http`
   - Forward Hostname: `stash-backend`
   - Forward Port: `3001`
   - Enable SSL (Let's Encrypt)

10. **Verify**
    - Admin (LAN): http://192.168.1.153:3002
    - Admin (proxy): https://stash.shottsserver.com
    - API (LAN): http://192.168.1.153:3001/api/health
    - API (proxy): https://stash-api.shottsserver.com/api/health

11. **Change the seeded passwords**

    The seed creates two real accounts (James as ADMIN, Savanah as USER)
    using either `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` from `.env`
    or the placeholder password printed by the seed output. Log in at
    https://stash.shottsserver.com and change them via Users → Reset
    Password before doing anything else.

12. **Set up mobile app**

    On each phone:
    1. Install **Expo Go** from App Store / Play Store
    2. Open the Stash app via QR code or link
    3. In Settings, set server URL to `http://100.122.58.114:3001`
       (or `https://stash-api.shottsserver.com` for proxy access)
    4. Login with your credentials

### Updating Production

```bash
ssh unraid
cd /mnt/user/appdata/stash/repo
git -c safe.directory=/mnt/user/appdata/stash/repo pull --ff-only
# Rebuild ONLY the stateless services. stash-postgres was created by hand
# (no Compose labels) — `up` without --no-deps fails on a name conflict.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-deps stash-backend stash-admin
# Run migrations if schema changed (version pinned — the CLI isn't a prod dependency):
docker exec -w /app/packages/backend stash-backend npx prisma@6.19.3 migrate deploy
```

> ⚠️ **Never run `prisma db seed` on production.** It deletes every table
> (it now refuses when items exist). For reference data use:
> `docker exec -w /app/packages/backend stash-backend node prisma/v2-reference-data.cjs`
> (idempotent — safe to re-run).

**Always back up before a deploy that includes a migration:**

```bash
docker exec stash-postgres pg_dump -U stash -d stash -Fc > /mnt/user/appdata/stash/backups/stash-$(date +%Y%m%d-%H%M).dump
```

### Production Checklist

- [ ] All containers running: `docker ps | grep stash`
- [ ] API health: `curl https://stash-api.shottsserver.com/api/health`
- [ ] Admin login works: https://stash.shottsserver.com
- [ ] Photo upload works (test with one item)
- [ ] QR code generation works (test with one container)
- [ ] Mobile app connects via Tailscale
- [ ] Price estimation works (test "Get Price Estimate" on a sell item)

### Production Data

Stash persistent data spans two locations on Unraid:

- **`/mnt/cache/appdata/stash/postgres/`** — Postgres data files. Direct
  NVMe; bypasses Unraid's FUSE/shfs layer for low-latency I/O. NOT
  parity-protected (NVMe cache pool isn't), so back up regularly.
- **`/mnt/user/appdata/stash/`** — Everything else (parity-protected via
  the user share):
  - `images/` — Item photos (JPEG, PNG, WebP, HEIC; 10 MB limit)
  - `qrcodes/` — Generated QR code PNGs
  - `exports/` — Generated CSV/PDF exports
  - `floorplans/` — Floor plan images
  - `repo/` — Cloned source code (rebuilt from `git pull` on each deploy)

This data is accessible from any device via the API over Tailscale or the proxy domain.

### Backup

Back up the PostgreSQL database regularly:
```bash
ssh unraid
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec stash-postgres \
  pg_dump -U stash stash > /mnt/user/appdata/stash/backup-$(date +%Y%m%d).sql
```
