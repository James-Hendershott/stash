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
