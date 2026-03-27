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
   npx prisma migrate dev --name init
   ```
   This reads `prisma/schema.prisma`, generates a SQL migration file, and
   creates all tables in the local PostgreSQL container.

6. **Seed the database**
   ```bash
   npx prisma db seed
   ```
   Populates the database with dev data: 2 users, locations, categories,
   items, containers, and placements. Default login: `james@stash.local` / `password123`.

7. **Verify**
   - Backend health: http://localhost:3001/api/health
   - Admin dashboard: http://localhost:3002 (login: `james@stash.local` / `password123`)
   - Database (via Prisma Studio): `npx prisma studio` (opens http://localhost:5555)
   - API login test:
     ```bash
     curl -X POST http://localhost:3001/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"james@stash.local","password":"password123"}'
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
   ```bash
   mkdir -p /mnt/user/appdata/stash/{postgres,images,qrcodes,exports,floorplans,repo}
   ```

3. **Set permissions**
   ```bash
   chown -R nobody:users /mnt/user/appdata/stash
   chmod -R 755 /mnt/user/appdata/stash
   ```

4. **Clone the repository**
   ```bash
   cd /mnt/user/appdata/stash/repo
   git clone git@github.com:james-hendershott/stash.git .
   ```

5. **Create production environment file**
   ```bash
   cp .env.example .env
   ```
   Update these values in `.env`:
   ```env
   NODE_ENV=production
   DATA_PATH=/mnt/user/appdata/stash
   POSTGRES_PASSWORD=<strong-password>
   DATABASE_URL=postgresql://stash:<strong-password>@stash-postgres:5432/stash
   JWT_SECRET=<long-random-string>
   ANTHROPIC_API_KEY=<your-actual-key>
   BACKEND_URL=https://stash-api.shottsserver.com
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

### Updating Production

```bash
ssh unraid
cd /mnt/user/appdata/stash/repo
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Production Data

All persistent data lives on Unraid at `/mnt/user/appdata/stash/`:
- `postgres/` — Database files
- `images/` — Item photos (served by backend API)
- `qrcodes/` — Generated QR codes
- `exports/` — CSV/PDF exports
- `floorplans/` — Floor plan images

This data is accessible from any device via the API over Tailscale or the proxy domain.
