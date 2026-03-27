# Changelog

All notable changes to Stash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
