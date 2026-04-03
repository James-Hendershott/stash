# Changelog

All notable changes to Stash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
