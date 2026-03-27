/**
 * Stash — Database Seed Script
 *
 * Populates the database with realistic development data.
 * Run with: npm run db:seed (or `npx prisma db seed`)
 *
 * This script is idempotent — it clears existing data before inserting.
 * Order matters: we delete in reverse dependency order (placements before
 * items before locations) and insert in forward dependency order.
 */

import { PrismaClient, Role, Condition, Fate, ShapeType, ContainerType, LocationType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Clean existing data (reverse dependency order) ──────────
  await prisma.activityLog.deleteMany();
  await prisma.itemPlacement.deleteMany();
  await prisma.container.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'james@stash.local',
      passwordHash,
      name: 'James',
      role: Role.ADMIN,
      mustChangePassword: false,
    },
  });

  const ashley = await prisma.user.create({
    data: {
      email: 'ashley@stash.local',
      passwordHash,
      name: 'Ashley',
      role: Role.USER,
      mustChangePassword: true,
    },
  });

  console.log(`  ✓ 2 users (admin: james@stash.local / password123)`);

  // ── Origin Locations (rooms in current house) ───────────────
  const origins = await Promise.all([
    prisma.location.create({
      data: { name: 'Living Room', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Main', color: '#3B82F6', sortOrder: 1 },
    }),
    prisma.location.create({
      data: { name: 'Kitchen', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Main', color: '#F59E0B', sortOrder: 2 },
    }),
    prisma.location.create({
      data: { name: 'Master Bedroom', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Upper', color: '#8B5CF6', sortOrder: 3 },
    }),
    prisma.location.create({
      data: { name: 'Office', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Main', color: '#10B981', sortOrder: 4 },
    }),
    prisma.location.create({
      data: { name: 'Garage', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Ground', color: '#6B7280', sortOrder: 5 },
    }),
    prisma.location.create({
      data: { name: 'Guest Bedroom', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Upper', color: '#EC4899', sortOrder: 6 },
    }),
    prisma.location.create({
      data: { name: 'Basement', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Lower', color: '#78716C', sortOrder: 7 },
    }),
    prisma.location.create({
      data: { name: 'Dining Room', type: LocationType.ORIGIN, house: 'Colorado Home', floor: 'Main', color: '#F97316', sortOrder: 8 },
    }),
  ]);

  // ── Destination Locations (rooms in new house) ──────────────
  const destinations = await Promise.all([
    prisma.location.create({
      data: { name: 'Living Room', type: LocationType.DESTINATION, house: 'North Carolina Home', floor: 'Main', color: '#3B82F6', sortOrder: 1 },
    }),
    prisma.location.create({
      data: { name: 'Kitchen', type: LocationType.DESTINATION, house: 'North Carolina Home', floor: 'Main', color: '#F59E0B', sortOrder: 2 },
    }),
    prisma.location.create({
      data: { name: 'Master Bedroom', type: LocationType.DESTINATION, house: 'North Carolina Home', floor: 'Upper', color: '#8B5CF6', sortOrder: 3 },
    }),
    prisma.location.create({
      data: { name: 'Office', type: LocationType.DESTINATION, house: 'North Carolina Home', floor: 'Main', color: '#10B981', sortOrder: 4 },
    }),
    prisma.location.create({
      data: { name: 'Garage', type: LocationType.DESTINATION, house: 'North Carolina Home', floor: 'Ground', color: '#6B7280', sortOrder: 5 },
    }),
  ]);

  console.log(`  ✓ ${origins.length} origin locations, ${destinations.length} destination locations`);

  // ── Categories ──────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Furniture', icon: 'sofa', color: '#8B5CF6' } }),
    prisma.category.create({ data: { name: 'Electronics', icon: 'monitor', color: '#3B82F6' } }),
    prisma.category.create({ data: { name: 'Kitchen', icon: 'utensils', color: '#F59E0B' } }),
    prisma.category.create({ data: { name: 'Clothing', icon: 'shirt', color: '#EC4899' } }),
    prisma.category.create({ data: { name: 'Books & Media', icon: 'book-open', color: '#10B981' } }),
    prisma.category.create({ data: { name: 'Tools', icon: 'wrench', color: '#6B7280' } }),
    prisma.category.create({ data: { name: 'Decor', icon: 'frame', color: '#F97316' } }),
    prisma.category.create({ data: { name: 'Sports & Outdoor', icon: 'bike', color: '#14B8A6' } }),
    prisma.category.create({ data: { name: 'Kids & Toys', icon: 'puzzle', color: '#A855F7' } }),
    prisma.category.create({ data: { name: 'Miscellaneous', icon: 'box', color: '#78716C' } }),
  ]);

  const [furniture, electronics, kitchen, clothing, books, tools, decor, sports, kids, misc] = categories;

  console.log(`  ✓ ${categories.length} categories`);

  // ── Container Items (items with isContainer=true + Container record) ──
  // A Container in Stash is an Item that can hold other Items.

  const ubox1Item = await prisma.item.create({
    data: {
      name: 'U-Box #1 — Living Room',
      description: 'First U-Box, packed from living room items',
      categoryId: misc.id,
      condition: Condition.GOOD,
      lengthIn: 95, widthIn: 56, heightIn: 83,
      shapeType: ShapeType.BOX,
      fate: Fate.KEEP,
      isContainer: true,
      originLocationId: origins[0].id, // Living Room
      destinationLocationId: destinations[0].id,
      addedById: admin.id,
      lastModifiedById: admin.id,
    },
  });

  const ubox1 = await prisma.container.create({
    data: {
      itemId: ubox1Item.id,
      containerType: ContainerType.UBOX,
      label: 'UBOX-001',
      internalLengthIn: 95,
      internalWidthIn: 56,
      internalHeightIn: 83,
      maxWeightLbs: 2000,
    },
  });

  const tote1Item = await prisma.item.create({
    data: {
      name: 'Kitchen Tote #1',
      description: 'Pots, pans, and cooking utensils',
      categoryId: kitchen.id,
      condition: Condition.GOOD,
      lengthIn: 24, widthIn: 16, heightIn: 14,
      shapeType: ShapeType.BOX,
      fate: Fate.KEEP,
      isContainer: true,
      originLocationId: origins[1].id, // Kitchen
      destinationLocationId: destinations[1].id,
      addedById: admin.id,
      lastModifiedById: admin.id,
    },
  });

  const tote1 = await prisma.container.create({
    data: {
      itemId: tote1Item.id,
      containerType: ContainerType.TOTE_27GAL,
      label: 'KITCHEN-T01',
      internalLengthIn: 24,
      internalWidthIn: 16,
      internalHeightIn: 14,
      maxWeightLbs: 50,
    },
  });

  const box1Item = await prisma.item.create({
    data: {
      name: 'Books Box — Office',
      description: 'Programming and reference books',
      categoryId: books.id,
      condition: Condition.GOOD,
      lengthIn: 18, widthIn: 18, heightIn: 16,
      shapeType: ShapeType.BOX,
      fate: Fate.KEEP,
      isContainer: true,
      originLocationId: origins[3].id, // Office
      destinationLocationId: destinations[3].id,
      addedById: admin.id,
      lastModifiedById: admin.id,
    },
  });

  const box1 = await prisma.container.create({
    data: {
      itemId: box1Item.id,
      containerType: ContainerType.BOX_MEDIUM,
      label: 'OFFICE-B01',
      internalLengthIn: 18,
      internalWidthIn: 18,
      internalHeightIn: 16,
      maxWeightLbs: 50,
    },
  });

  console.log('  ✓ 3 containers (U-Box, tote, medium box)');

  // ── Regular Items ───────────────────────────────────────────

  const items = await Promise.all([
    // Living Room
    prisma.item.create({
      data: {
        name: 'Sectional Sofa',
        description: 'Gray L-shaped sectional, 3 pieces',
        categoryId: furniture.id,
        condition: Condition.GOOD,
        lengthIn: 110, widthIn: 85, heightIn: 35, weightLbs: 180,
        shapeType: ShapeType.L_SHAPE,
        fate: Fate.KEEP,
        originLocationId: origins[0].id,
        destinationLocationId: destinations[0].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
    prisma.item.create({
      data: {
        name: '65" Samsung TV',
        description: 'Samsung QN65Q80B QLED',
        categoryId: electronics.id,
        condition: Condition.GOOD,
        lengthIn: 57, widthIn: 4, heightIn: 33, weightLbs: 52,
        shapeType: ShapeType.PANEL,
        fate: Fate.KEEP,
        estimatedSaleValue: 800,
        originLocationId: origins[0].id,
        destinationLocationId: destinations[0].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Coffee Table',
        description: 'Walnut mid-century modern',
        categoryId: furniture.id,
        condition: Condition.FAIR,
        lengthIn: 48, widthIn: 24, heightIn: 18, weightLbs: 45,
        shapeType: ShapeType.BOX,
        fate: Fate.SELL,
        estimatedSaleValue: 150,
        originLocationId: origins[0].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),

    // Kitchen
    prisma.item.create({
      data: {
        name: 'KitchenAid Stand Mixer',
        description: 'Artisan 5-quart, red',
        categoryId: kitchen.id,
        condition: Condition.GOOD,
        lengthIn: 14, widthIn: 9, heightIn: 14, weightLbs: 26,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        originLocationId: origins[1].id,
        destinationLocationId: destinations[1].id,
        addedById: ashley.id, lastModifiedById: ashley.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Cast Iron Skillet Set',
        description: 'Lodge 10" and 12"',
        categoryId: kitchen.id,
        condition: Condition.GOOD,
        lengthIn: 12, widthIn: 12, heightIn: 4, weightLbs: 12,
        shapeType: ShapeType.CYLINDER,
        fate: Fate.KEEP,
        originLocationId: origins[1].id,
        destinationLocationId: destinations[1].id,
        addedById: ashley.id, lastModifiedById: ashley.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Old Microwave',
        description: 'Panasonic, works but loud',
        categoryId: kitchen.id,
        condition: Condition.POOR,
        lengthIn: 20, widthIn: 15, heightIn: 12, weightLbs: 30,
        shapeType: ShapeType.BOX,
        fate: Fate.TRASH,
        originLocationId: origins[1].id,
        addedById: ashley.id, lastModifiedById: ashley.id,
      },
    }),

    // Office
    prisma.item.create({
      data: {
        name: 'Standing Desk',
        description: 'Uplift V2 60x30, bamboo top',
        categoryId: furniture.id,
        condition: Condition.GOOD,
        lengthIn: 60, widthIn: 30, heightIn: 50, weightLbs: 95,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        originLocationId: origins[3].id,
        destinationLocationId: destinations[3].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Herman Miller Aeron',
        description: 'Size B, remastered',
        categoryId: furniture.id,
        condition: Condition.GOOD,
        lengthIn: 27, widthIn: 27, heightIn: 45, weightLbs: 45,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        estimatedSaleValue: 900,
        originLocationId: origins[3].id,
        destinationLocationId: destinations[3].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Dell 27" Monitor',
        description: 'U2723QE 4K USB-C',
        categoryId: electronics.id,
        condition: Condition.GOOD,
        lengthIn: 24, widthIn: 8, heightIn: 21, weightLbs: 14,
        shapeType: ShapeType.PANEL,
        fate: Fate.KEEP,
        originLocationId: origins[3].id,
        destinationLocationId: destinations[3].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),

    // Garage
    prisma.item.create({
      data: {
        name: 'Mountain Bike',
        description: 'Trek Fuel EX 8, 2023',
        categoryId: sports.id,
        condition: Condition.GOOD,
        lengthIn: 68, widthIn: 26, heightIn: 42, weightLbs: 32,
        shapeType: ShapeType.L_SHAPE,
        fate: Fate.KEEP,
        originLocationId: origins[4].id,
        destinationLocationId: destinations[4].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Cordless Drill Set',
        description: 'DeWalt 20V MAX with two batteries',
        categoryId: tools.id,
        condition: Condition.GOOD,
        lengthIn: 16, widthIn: 12, heightIn: 5, weightLbs: 8,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        originLocationId: origins[4].id,
        destinationLocationId: destinations[4].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Old Garden Hose',
        description: '50ft, has kinks and leaks',
        categoryId: sports.id,
        condition: Condition.POOR,
        fate: Fate.TRASH,
        originLocationId: origins[4].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),

    // Master Bedroom
    prisma.item.create({
      data: {
        name: 'King Bed Frame',
        description: 'West Elm mid-century platform, walnut',
        categoryId: furniture.id,
        condition: Condition.GOOD,
        lengthIn: 86, widthIn: 80, heightIn: 35, weightLbs: 120,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        originLocationId: origins[2].id,
        destinationLocationId: destinations[2].id,
        addedById: ashley.id, lastModifiedById: ashley.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Nightstand Pair',
        description: 'Matching walnut nightstands',
        categoryId: furniture.id,
        condition: Condition.GOOD,
        quantity: 2,
        lengthIn: 22, widthIn: 16, heightIn: 24, weightLbs: 25,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        originLocationId: origins[2].id,
        destinationLocationId: destinations[2].id,
        addedById: ashley.id, lastModifiedById: ashley.id,
      },
    }),

    // Guest Bedroom
    prisma.item.create({
      data: {
        name: 'Folding Table',
        description: 'Lifetime 6ft folding table',
        categoryId: furniture.id,
        condition: Condition.FAIR,
        lengthIn: 72, widthIn: 30, heightIn: 29, weightLbs: 37,
        shapeType: ShapeType.PANEL,
        fate: Fate.DONATE,
        originLocationId: origins[5].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),

    // Basement
    prisma.item.create({
      data: {
        name: 'Christmas Decorations',
        description: 'Tree, lights, and ornaments in 3 totes',
        categoryId: decor.id,
        condition: Condition.GOOD,
        lengthIn: 24, widthIn: 16, heightIn: 14,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        quantity: 3,
        originLocationId: origins[6].id,
        addedById: ashley.id, lastModifiedById: ashley.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Kids Board Games',
        description: 'Monopoly, Clue, Ticket to Ride, Catan',
        categoryId: kids.id,
        condition: Condition.GOOD,
        lengthIn: 20, widthIn: 15, heightIn: 12,
        shapeType: ShapeType.BOX,
        fate: Fate.KEEP,
        originLocationId: origins[6].id,
        addedById: ashley.id, lastModifiedById: ashley.id,
      },
    }),

    // Dining Room
    prisma.item.create({
      data: {
        name: 'Dining Table',
        description: 'Solid oak, seats 6, with leaf extension',
        categoryId: furniture.id,
        condition: Condition.GOOD,
        lengthIn: 72, widthIn: 42, heightIn: 30, weightLbs: 110,
        shapeType: ShapeType.BOX,
        fate: Fate.SELL,
        estimatedSaleValue: 400,
        originLocationId: origins[7].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
    prisma.item.create({
      data: {
        name: 'Dining Chairs',
        description: 'Set of 6 oak ladder-back chairs',
        categoryId: furniture.id,
        condition: Condition.FAIR,
        quantity: 6,
        lengthIn: 18, widthIn: 18, heightIn: 38, weightLbs: 12,
        shapeType: ShapeType.BOX,
        fate: Fate.SELL,
        estimatedSaleValue: 200,
        originLocationId: origins[7].id,
        addedById: admin.id, lastModifiedById: admin.id,
      },
    }),
  ]);

  console.log(`  ✓ ${items.length} items`);

  // ── Placements (put some items into containers) ─────────────

  // Put the stand mixer and skillets into Kitchen Tote #1
  await prisma.itemPlacement.createMany({
    data: [
      { itemId: items[3].id, containerId: tote1.id, placedById: ashley.id },
      { itemId: items[4].id, containerId: tote1.id, placedById: ashley.id },
    ],
  });

  // Put board games into the U-Box
  await prisma.itemPlacement.create({
    data: { itemId: items[16].id, containerId: ubox1.id, placedById: admin.id },
  });

  // Put Christmas decorations into the U-Box
  await prisma.itemPlacement.create({
    data: { itemId: items[15].id, containerId: ubox1.id, placedById: admin.id },
  });

  console.log('  ✓ 4 item placements');

  // ── Activity Logs ───────────────────────────────────────────

  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'CREATE',
        entityType: 'Item',
        entityId: items[0].id,
        newValue: { name: 'Sectional Sofa', fate: 'KEEP' },
      },
      {
        userId: ashley.id,
        action: 'CREATE',
        entityType: 'Item',
        entityId: items[3].id,
        newValue: { name: 'KitchenAid Stand Mixer', fate: 'KEEP' },
      },
      {
        userId: admin.id,
        action: 'UPDATE',
        entityType: 'Item',
        entityId: items[2].id,
        previousValue: { fate: 'UNDECIDED' },
        newValue: { fate: 'SELL', estimatedSaleValue: 150 },
      },
    ],
  });

  console.log('  ✓ 3 activity log entries');

  console.log('\n✅ Seed complete!');
  console.log('   Login: james@stash.local / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
