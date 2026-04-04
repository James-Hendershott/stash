# Stash — Backlog

Future enhancements and ideas. Not prioritized — revisit after v1.0.

## Features

- [ ] Update destination locations with real NC property data
- [ ] Floor plan v2: image overlay with draggable room zones (uses floorPlanX/Y/Width/Height)
- [ ] Interactive floor plan furniture placement (v3 of floor plan view)
- [ ] iGUIDE 3D walkthrough integration
- [ ] Home Mode: check-in / check-out log for items
- [ ] Full property-wide search ("where is my X?")
- [ ] Barcode / UPC scanning for retail items
- [ ] Insurance valuation export
- [ ] Multi-property support
- [ ] Native mobile QR label printing (direct to Bluetooth printer)
- [ ] Batch QR code generation (generate all at once for a container set)
- [ ] Image thumbnail generation on upload (sharp library, save 200px thumbs)
- [ ] Image compression / WebP conversion on upload for storage savings
- [ ] Batch price estimation (estimate all SELL items at once)
- [ ] Price comparison (show owner's estimate vs AI estimate side by side)
- [ ] LLM-powered item description generation from photos (vision API)
- [ ] Push notifications for sync conflicts
- [ ] Shared packing list views for helpers
- [ ] Facebook Marketplace / OfferUp API integration for listings
- [ ] Add Stash to Homarr dashboard on ShottsServer
- [ ] Add Stash to shottsserver-logins-and-credentials doc

## Technical Debt

- [ ] Add unit tests (backend services, shared utils)
- [ ] Add integration tests (API endpoints)
- [ ] Add E2E tests (admin dashboard flows — Playwright or Cypress)
- [ ] Admin dark mode toggle
- [ ] Admin responsive layout (mobile sidebar collapse)
- [ ] Admin item bulk selection and bulk fate update
- [ ] Admin container packing wizard (drag items into containers)
- [ ] Mobile: WatermelonDB offline sync (requires custom Expo dev build, not Expo Go)
- [ ] Mobile: auto-sync on app foreground and on connectivity change
- [ ] Mobile: conflict resolution UI (show both versions, let user pick)
- [x] ~~3D view: click items to see details / highlight~~ (done — hover tooltips + click select)
- [x] ~~3D view: drag-and-drop item placement within container~~ (done — drag, rotate, collision, stacking)
- [x] ~~3D add-item screen: live shape preview while entering dimensions~~ (done — shape preview on create page)
- [ ] 3D view: save repositioned item positions to database
- [ ] 3D view: undo/redo for position changes
- [ ] Mobile: barcode/UPC scanning with product lookup
- [ ] Mobile: haptic feedback on fate selection
- [ ] Mobile: push notifications for sync status
- [ ] Export: room-by-room PDF report (items grouped by origin location)
- [ ] Export: custom QR label layout (configurable sizes, with/without text)
- [ ] Export: insurance valuation report PDF
- [ ] Add mobile UI tests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Database backups (automated pg_dump to Unraid share)
- [ ] Rate limiting on API endpoints (express-rate-limit)
- [ ] Request logging / observability (morgan or pino)
- [ ] API pagination on item list endpoint (cursor-based)
- [ ] Bulk fate update endpoint (update multiple items at once)
- [ ] Image optimization / thumbnail generation on upload
- [ ] Auto-generate @stash/shared types from Prisma schema (prisma-generator or zod-prisma)
- [ ] Add database connection pooling (PgBouncer or Prisma Accelerate) for production
