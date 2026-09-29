# Stash — Backlog

Everything not yet done. **Scheduled work lives in [SPEC.md](SPEC.md)** (Phases 0–6) — items
below that belong to a phase are marked with it. Unscheduled ideas stay here until they're pulled
into a phase.

## Scheduled in the v2 spec

- [ ] Real locations for 1642 W Blue Flax Dr + storage unit 3204 (Place › Area › Spot) — **Phase 0**
- [ ] Two-level categories, tote model catalog, container numbers — **Phase 0**
- [ ] Automated database backups (`pg_dump` to the Unraid share) — **Phase 0**
- [ ] Mobile: container screen with contents; scan a tote → contents; full "where is it" chain in search — **Phase 1**
- [ ] Full property-wide search ("where is my X?") — **Phase 1**
- [ ] Mobile: camera-first Add Item, put item in a container, make any item a container — **Phase 2**
- [ ] Duplicate detection on add + admin "possible duplicates" list — **Phase 2**
- [ ] Barcode / UPC scanning for retail items (feeds duplicate matching) — **Phase 2**
- [ ] Admin "Create Container" form (phone flow first) — **Phase 2**
- [ ] Ready for Storage flow; QR labels for Phomemo M110 (50×80 mm), 2″×2″ sheets, location legends — **Phase 3**
- [ ] Batch QR label generation — **Phase 3**
- [ ] Check out / return items; container transfers with remembered home spot; archive; Sold/Disposed delete — **Phase 4**
- [ ] Home Mode check-in / check-out log — **Phase 4** (replaced by the Checkout model)
- [ ] Reminders: scheduler, in-app inbox, admin-configurable intervals; decide install method for push — **Phase 5**
- [ ] AI photo fill (Claude vision) with spend cap; book catalog from phone photos — **Phase 6**
- [ ] LLM-powered item descriptions from photos for non-book items — **Phase 6**

## Unscheduled features

- [ ] Admin "Books → Import CSV" page — drag-drop CSV upload, preview, results table
- [ ] Admin Books list filters — by ISBN, author, binding, edition
- [ ] Book CSV export with bibliographic columns (round-trip the import format)
- [ ] Books: where do books live? (shelves/dressers everywhere — separate location question)
- [ ] Permanent install for the phones (self-hosted web app on Unraid vs EAS Update vs TestFlight) — decide before Phase 5
- [ ] Persist the mobile Server URL setting (currently resets on app restart)
- [ ] Image thumbnail generation + compression / WebP on upload (sharp)
- [ ] Insurance valuation export
- [ ] Add Stash to Homarr dashboard on ShottsServer
- [ ] Add Stash to the shottsserver logins-and-credentials doc

## Back-burnered (v1 move planning)

Still in the code, not being extended while the v2 storage work is in progress.

- [ ] Update destination locations with real NC property data
- [ ] Floor plan v2: image overlay with draggable room zones
- [ ] Interactive floor plan furniture placement
- [ ] iGUIDE 3D walkthrough integration
- [ ] Multi-property support
- [ ] Batch price estimation / price comparison (owner vs AI estimate)
- [ ] Facebook Marketplace / OfferUp listing integration
- [ ] Shared packing list views for helpers
- [ ] 3D view: save repositioned item positions; undo/redo
- [ ] Export: room-by-room PDF report

## Technical debt

- [ ] **Adopt `stash-postgres` into Docker Compose** — it was created by hand (no Compose labels), so deploys must use `--no-deps`. Needs a backup + a planned container swap on the same data dir (BUILD_LOG ch. 30)
- [ ] Remove parked `stash-backend-old` / `stash-admin-old` containers once v1.5.1 is confirmed on the phone
- [ ] **Security:** refuse to start in production without `JWT_SECRET` (config falls back to a dev secret)
- [ ] **Security:** `/api/files/*` (photos, QR, exports) is served without auth
- [ ] **Security:** rate limiting on `/api/auth/login` (express-rate-limit); tighten open CORS
- [ ] **Security:** import / export / activity routes are available to any logged-in user — decide which are admin-only
- [ ] Remove leftover WatermelonDB sync code (`routes/sync.ts`, mobile `SyncContext` / `SyncIndicator`), or wire up `Container3DScreen`
- [ ] Add unit tests (backend services, shared utils)
- [ ] Add integration tests (API endpoints)
- [ ] Add E2E tests (admin flows — Playwright)
- [ ] Add mobile UI tests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Request logging / observability (morgan or pino)
- [ ] API pagination on the item list endpoint (cursor-based)
- [ ] Debounce mobile search (currently refetches every keystroke) and surface fetch errors
- [ ] Mobile: `@types/react` pinned to 18 by the root override (admin) — split per workspace
- [ ] Mobile: React Navigation v6 → v7
- [ ] Auto-generate `@stash/shared` types from the Prisma schema
- [ ] Admin dark mode, bulk selection + bulk actions
- [ ] Mobile: haptic feedback on actions
- [ ] Database connection pooling (PgBouncer) if needed

## Done

- [x] ~~Mobile Change Password screen~~ (v1.3.0)
- [x] ~~Expo SDK 57 upgrade~~ (v1.3.0)
- [x] ~~Books schema, free metadata lookup, enrichment script, bulk CSV import~~ (v1.2.0)
- [x] ~~Container codes + CSV auto-create~~ (v1.2.1)
- [x] ~~3D view: click/highlight, drag, rotate, collision, stacking; live shape preview~~ (v1.1.0)
