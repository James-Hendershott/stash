# Stash — Backlog

Future enhancements and ideas. Not prioritized — revisit after v1.0.

## Features

- [ ] Update destination locations with real NC property data
- [ ] Interactive floor plan furniture placement (v2 of floor plan view)
- [ ] iGUIDE 3D walkthrough integration
- [ ] Home Mode: check-in / check-out log for items
- [ ] Full property-wide search ("where is my X?")
- [ ] Barcode / UPC scanning for retail items
- [ ] Insurance valuation export
- [ ] Multi-property support
- [ ] Native mobile QR label printing (direct to Bluetooth printer)
- [ ] Push notifications for sync conflicts
- [ ] Shared packing list views for helpers
- [ ] Facebook Marketplace / OfferUp API integration for listings
- [ ] Add Stash to Homarr dashboard on ShottsServer
- [ ] Add Stash to shottsserver-logins-and-credentials doc

## Technical Debt

- [ ] Add unit tests (backend services, shared utils)
- [ ] Add integration tests (API endpoints)
- [ ] Add E2E tests (admin dashboard flows)
- [ ] Add mobile UI tests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Database backups (automated pg_dump to Unraid share)
- [ ] Rate limiting on API endpoints
- [ ] Request logging / observability
- [ ] Image optimization / thumbnail generation on upload
- [ ] Auto-generate @stash/shared types from Prisma schema (prisma-generator or zod-prisma)
- [ ] Add database connection pooling (PgBouncer or Prisma Accelerate) for production
