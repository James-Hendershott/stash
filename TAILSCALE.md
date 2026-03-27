# Stash — Remote Access via Tailscale

Tailscale is already configured on ShottsServer, phones, and development machine.

## Server Details

- **Server Tailscale IP:** 100.122.58.114
- **Server LAN IP:** 192.168.1.153

## Access URLs

### Mobile App

Set `BACKEND_URL` in the mobile app to:
```
http://100.122.58.114:3001
```

When on the local network, you can also use:
```
http://192.168.1.153:3001
```

Or via the proxy (works everywhere, with SSL):
```
https://stash-api.shottsserver.com
```

### Admin Dashboard

Login: `james@stash.local` / `password123` (or your production password)

| Method | URL |
|--------|-----|
| Tailscale | http://100.122.58.114:3002 |
| LAN | http://192.168.1.153:3002 |
| Proxy | https://stash.shottsserver.com |

### API Direct Access

| Method | URL |
|--------|-----|
| Tailscale | http://100.122.58.114:3001 |
| LAN | http://192.168.1.153:3001 |
| Proxy | https://stash-api.shottsserver.com |

## How It Works

The mobile React Native app stores the backend URL in its settings.
When connected via Tailscale (from anywhere — cellular, other WiFi networks, etc.),
the app reaches the Unraid server directly using the Tailscale IP.

No port forwarding, no public exposure. Tailscale creates an encrypted
peer-to-peer tunnel between your devices and the server.

## Troubleshooting

1. **Can't reach server:** Verify Tailscale is connected on both devices
   ```bash
   tailscale status
   ```

2. **Slow connection:** Tailscale usually establishes direct connections,
   but may relay through DERP servers initially. Give it a moment.

3. **API returns errors:** Check that Docker containers are running on Unraid:
   ```bash
   ssh unraid
   docker ps | grep stash
   ```

4. **Database connection issues:** If the backend can't reach Postgres, verify
   the database container is healthy:
   ```bash
   ssh unraid
   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs stash-postgres
   ```

## Database Access

Prisma Studio can be used to browse production data. SSH into Unraid and run:
```bash
cd /mnt/user/appdata/stash/repo/packages/backend
npx prisma studio
```
Then access via Tailscale: `http://100.122.58.114:5555`

For direct database access (psql), connect from any Tailscale device:
```bash
psql "postgresql://stash:<password>@100.122.58.114:5432/stash"
```
Note: Port 5432 is only exposed on the Tailscale interface in production, not publicly.

## API Testing via Tailscale

Test the API from any device on the Tailscale network:
```bash
# Health check
curl http://100.122.58.114:3001/api/health

# Login
curl -X POST http://100.122.58.114:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"james@stash.local","password":"<your-password>"}'

# Authenticated request (replace TOKEN)
curl http://100.122.58.114:3001/api/items \
  -H "Authorization: Bearer TOKEN"

# Upload a photo via Tailscale
curl -X POST http://100.122.58.114:3001/api/items/ITEM_ID/photo \
  -H "Authorization: Bearer TOKEN" \
  -F "photo=@/path/to/photo.jpg"

# View uploaded photos / QR codes
open http://100.122.58.114:3001/api/files/images/photo.jpg
open http://100.122.58.114:3001/api/files/qrcodes/item-abc-123.png

# Get an AI price estimate for an item
curl -X POST http://100.122.58.114:3001/api/items/ITEM_ID/price-estimate \
  -H "Authorization: Bearer TOKEN"
```
