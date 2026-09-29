/**
 * Stash — Database Seed Script
 *
 * Populates the database with the *real scaffold only*:
 *   - 2 user accounts (1 admin, 1 user) — passwords come from env vars
 *   - Origin locations (Eagle Mountain, UT — current house)
 *   - Destination locations (placeholder rooms — update once NC property
 *     is under contract; see D:/James_Journey/projects/active/stash/
 *     stash-destination-room-list.md for the source list)
 *   - Category templates
 *
 * No fake items, containers, placements, or activity logs are created.
 * The admin adds those through the UI (or CSV import) once running.
 *
 * Run with: npm run db:seed (or `npx prisma db seed`)
 *
 * Env vars (optional):
 *   SEED_ADMIN_PASSWORD — initial password for the admin user
 *   SEED_USER_PASSWORD  — initial password for the regular user
 *
 * If unset, both default to a placeholder that the script will warn about.
 *
 * ⚠️ DESTRUCTIVE — it deletes ALL existing data before inserting, and
 * refuses to run if items exist unless SEED_FORCE=yes. For an existing
 * database run prisma/v2-reference-data.cjs instead. Never use `prisma migrate
 * deploy` to apply schema changes without touching data.
 */

import { PrismaClient, Role, LocationType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PLACEHOLDER_PASSWORD = 'ChangeMeNow2026!';

async function main() {
  // ── Safety guard ───────────────────────────────────────────
  // This seed WIPES every table. Refuse to run against a database that
  // already holds items unless explicitly forced — one stray
  // `prisma db seed` in production would otherwise erase everything.
  const existingItems = await prisma.item.count();
  if (existingItems > 0 && process.env.SEED_FORCE !== 'yes') {
    throw new Error(
      `Refusing to seed: the database already has ${existingItems} items and the seed deletes ALL data. ` +
        'For reference data on an existing database run prisma/v2-reference-data.cjs instead. ' +
        'To wipe and re-seed anyway (dev only), set SEED_FORCE=yes.',
    );
  }

  console.log('🌱 Seeding database...');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || PLACEHOLDER_PASSWORD;
  const userPassword = process.env.SEED_USER_PASSWORD || PLACEHOLDER_PASSWORD;
  const usingPlaceholder =
    adminPassword === PLACEHOLDER_PASSWORD || userPassword === PLACEHOLDER_PASSWORD;

  // ── Clean existing data (reverse dependency order) ──────────
  await prisma.activityLog.deleteMany();
  await prisma.itemPlacement.deleteMany();
  await prisma.container.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ───────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const userHash = await bcrypt.hash(userPassword, 10);

  await prisma.user.create({
    data: {
      email: 'jameshendershott85@gmail.com',
      passwordHash: adminHash,
      name: 'James',
      role: Role.ADMIN,
      // No self-service change-password page exists yet (see BACKLOG).
      // Admin should reset their password via the Users page after first login.
      mustChangePassword: false,
    },
  });

  await prisma.user.create({
    data: {
      email: 'mama.shotts@gmail.com',
      passwordHash: userHash,
      name: 'Savanah',
      role: Role.USER,
      mustChangePassword: true,
    },
  });

  console.log('  ✓ 2 users (1 admin, 1 user)');

  // ── Origin Locations (current house — Eagle Mountain, UT) ───
  const ORIGIN_HOUSE = 'Eagle Mountain, UT';
  const origins = [
    { name: 'Living Room',     floor: 'Main',   color: '#3B82F6', sortOrder: 1 },
    { name: 'Kitchen',         floor: 'Main',   color: '#F59E0B', sortOrder: 2 },
    { name: 'Dining Room',     floor: 'Main',   color: '#F97316', sortOrder: 3 },
    { name: 'Office',          floor: 'Main',   color: '#10B981', sortOrder: 4 },
    { name: 'Master Bedroom',  floor: 'Upper',  color: '#8B5CF6', sortOrder: 5 },
    { name: 'Guest Bedroom',   floor: 'Upper',  color: '#EC4899', sortOrder: 6 },
    { name: 'Basement',        floor: 'Lower',  color: '#78716C', sortOrder: 7 },
    { name: 'Garage',          floor: 'Ground', color: '#6B7280', sortOrder: 8 },
    // Special-purpose origin locations used by CSV import:
    { name: 'In Storage / U-Box',   floor: 'Storage',  color: '#7C2D3B', sortOrder: 90 },
    { name: 'Unsorted',             floor: 'Storage',  color: '#9CA3AF', sortOrder: 91 },
  ];
  await Promise.all(
    origins.map((r) =>
      prisma.location.create({
        data: { ...r, type: LocationType.ORIGIN, house: ORIGIN_HOUSE },
      }),
    ),
  );
  console.log(`  ✓ ${origins.length} origin rooms (${ORIGIN_HOUSE})`);

  // ── Destination Locations (placeholder template) ────────────
  // Template ONLY — the destination property is not yet under contract.
  // Hex colors are property-agnostic and stay; replace `name` and add real
  // floorPlan dimensions once a property is identified.
  const DESTINATION_HOUSE = 'NC Property — TBD';
  const destinations = [
    // Main Floor (17)
    { name: 'Entry / Foyer',              floor: 'Main',        color: '#B8860B', sortOrder: 1 },
    { name: 'Living Room',                floor: 'Main',        color: '#1B3A6B', sortOrder: 2 },
    { name: 'Second Living / Den',        floor: 'Main',        color: '#2C5F2E', sortOrder: 3 },
    { name: 'Dining Room',                floor: 'Main',        color: '#E07B39', sortOrder: 4 },
    { name: 'Kitchen',                    floor: 'Main',        color: '#8B4513', sortOrder: 5 },
    { name: 'Mudroom / Laundry Entry',    floor: 'Main',        color: '#696969', sortOrder: 6 },
    { name: 'Laundry Room',               floor: 'Main',        color: '#4682B4', sortOrder: 7 },
    { name: 'Hallway',                    floor: 'Main',        color: '#9CA3AF', sortOrder: 8 },
    { name: 'Primary Bedroom',            floor: 'Main',        color: '#1B3A6B', sortOrder: 9 },
    { name: 'Primary Closet',             floor: 'Main',        color: '#1B3A6B', sortOrder: 10 },
    { name: 'Primary Bathroom',           floor: 'Main',        color: '#6B7280', sortOrder: 11 },
    { name: 'Shared Bathroom',            floor: 'Main',        color: '#6B7280', sortOrder: 12 },
    { name: 'Kids Bedroom 1 (Sissy)',     floor: 'Main',        color: '#9B7FD4', sortOrder: 13 },
    { name: 'Kids Bedroom 1 Closet',      floor: 'Main',        color: '#9B7FD4', sortOrder: 14 },
    { name: 'Kids Bedroom 2 (Brother)',   floor: 'Main',        color: '#2D6A4F', sortOrder: 15 },
    { name: 'Kids Bedroom 2 Closet',      floor: 'Main',        color: '#2D6A4F', sortOrder: 16 },
    { name: 'Back Porch / Patio',         floor: 'Main',        color: '#6B7A2D', sortOrder: 17 },
    // Basement (4)
    { name: 'Basement Garage',            floor: 'Basement',    color: '#374151', sortOrder: 18 },
    { name: 'Basement Main Area',         floor: 'Basement',    color: '#2563EB', sortOrder: 19 },
    { name: 'Basement Secondary Area',    floor: 'Basement',    color: '#2563EB', sortOrder: 20 },
    { name: 'Basement Utility',           floor: 'Basement',    color: '#9CA3AF', sortOrder: 21 },
    // Outbuildings (7) — concepts apply to any rural property
    { name: "James's Office",             floor: 'Outbuilding', color: '#7C2D3B', sortOrder: 22 },
    { name: "Savanah's Studio",           floor: 'Outbuilding', color: '#DB6B8A', sortOrder: 23 },
    { name: 'Woodshop',                   floor: 'Outbuilding', color: '#8B4513', sortOrder: 24 },
    { name: 'Barn / Forge',               floor: 'Outbuilding', color: '#374151', sortOrder: 25 },
    { name: 'Garden / Animals',           floor: 'Outbuilding', color: '#6B7A2D', sortOrder: 26 },
    { name: 'Livestock Barn',             floor: 'Outbuilding', color: '#C4A35A', sortOrder: 27 },
    { name: 'General Storage',            floor: 'Outbuilding', color: '#9CA3AF', sortOrder: 28 },
    // Property exterior (4)
    { name: 'Carport / Garage',           floor: 'Property',    color: '#9CA3AF', sortOrder: 29 },
    { name: 'Garden Beds',                floor: 'Property',    color: '#6B7A2D', sortOrder: 30 },
    { name: 'Yard / Pasture',             floor: 'Property',    color: '#6B7A2D', sortOrder: 31 },
    { name: 'Driveway',                   floor: 'Property',    color: '#9CA3AF', sortOrder: 32 },
  ];
  await Promise.all(
    destinations.map((r) =>
      prisma.location.create({
        data: { ...r, type: LocationType.DESTINATION, house: DESTINATION_HOUSE },
      }),
    ),
  );
  console.log(`  ✓ ${destinations.length} destination rooms (${DESTINATION_HOUSE} — placeholder)`);

  // ── Categories (templates) ──────────────────────────────────
  const categories = [
    { name: 'Furniture',          icon: 'sofa',      color: '#8B5CF6' },
    { name: 'Electronics',        icon: 'monitor',   color: '#3B82F6' },
    { name: 'Kitchen',            icon: 'utensils',  color: '#F59E0B' },
    { name: 'Clothing',           icon: 'shirt',     color: '#EC4899' },
    { name: 'Books & Media',      icon: 'book-open', color: '#10B981' },
    { name: 'Tools',              icon: 'wrench',    color: '#6B7280' },
    { name: 'Decor',              icon: 'frame',     color: '#F97316' },
    { name: 'Camping & Outdoors', icon: 'tent',      color: '#15803D' },
    { name: 'Sports & Outdoor',   icon: 'bike',      color: '#14B8A6' },
    { name: 'Kids & Toys',        icon: 'puzzle',    color: '#A855F7' },
    { name: 'Miscellaneous',      icon: 'box',       color: '#78716C' },
  ];
  await Promise.all(categories.map((c) => prisma.category.create({ data: c })));
  console.log(`  ✓ ${categories.length} categories`);

  // ── v2 reference data (tote models, category tree, Blue Flax + storage
  // unit locations). Shared with the production script so both stay in sync.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { applyReferenceData } = require('./v2-reference-data.cjs');
  await applyReferenceData(prisma, (...args: unknown[]) => console.log('  ✓', ...args));

  console.log('\n✅ Seed complete!');
  console.log('');
  console.log('   Admin:  jameshendershott85@gmail.com');
  console.log('   User:   mama.shotts@gmail.com  (mustChangePassword=true)');

  if (usingPlaceholder) {
    console.log('');
    console.log('   ⚠️  PLACEHOLDER PASSWORD IN USE: ' + PLACEHOLDER_PASSWORD);
    console.log('   ⚠️  Change it from the admin Users page IMMEDIATELY after first login,');
    console.log('   ⚠️  or re-run seed with SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD set.');
  } else {
    console.log('   Passwords were set from SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD env vars.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
