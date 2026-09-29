// Stash v2 reference data — tote models, category tree, the Blue Flax +
// storage-unit location tree, and container numbers for the kept totes.
// See SPEC.md ("Data model changes", "Locations", "Categories").
//
// IDEMPOTENT: every step is find-or-create / update-if-different, so it is
// safe to run any number of times. It never deletes anything — old move
// rooms are *archived* (hidden), not removed.
//
// Run (production, after `prisma migrate deploy`):
//   docker exec -w /app/packages/backend stash-backend node prisma/v2-reference-data.cjs
// Run (local dev):
//   cd packages/backend && DATABASE_URL=postgresql://stash:stash@localhost:5434/stash node prisma/v2-reference-data.cjs
//
// Also called at the end of prisma/seed.ts so fresh installs get the same data.

const { PrismaClient } = require('@prisma/client');

// ── Tote models ──────────────────────────────────────────────
// Dimensions are left empty unless confirmed — measure one of each and
// fill them in from the phone later. (Retailer pages list exterior sizes;
// the HDX 27 gal exterior is 28.55" × 19.61" × 15.27".)
const CONTAINER_MODELS = [
  { brand: 'HDX', name: '6.5 Qt Tough Storage Tote', capacity: '6.5 qt' },
  { brand: 'HDX', name: '14 Gal Tough Storage Tote', capacity: '14 gal', notes: 'Shares lids with the 27 gal.' },
  { brand: 'HDX', name: '27 Gal Tough Storage Tote', capacity: '27 gal', notes: 'Shares lids with the 14 gal. Exterior 28.55" × 19.61" × 15.27" (Home Depot listing).' },
  { brand: 'HDX', name: '40 Gal Tough Storage Tote', capacity: '40 gal' },
  { brand: "Sam's Club", name: 'Tough Box 27 Gal Storage Tote', capacity: '27 gal' },
  { brand: 'Sterilite', name: 'Large Storage Bin 27 Gal', capacity: '27 gal', notes: 'Walmart.' },
  { brand: 'Generic', name: 'Cardboard Box', capacity: null },
  { brand: 'Generic', name: 'Custom Container', capacity: null, notes: 'Any item used as a container — cedar chest, suitcase, etc.' },
].map((m, i) => ({ ...m, sortOrder: i }));

// ── Categories (SPEC.md "Categories") ────────────────────────
// `from` renames an existing v1 category in place so its items keep their link.
const CATEGORIES = [
  { name: 'Holiday & Seasonal', icon: 'gift', color: '#DC2626', subs: ['Christmas', 'Halloween', 'Easter', 'Fall/Thanksgiving', 'Other Holidays'] },
  { name: 'Home Decor', from: 'Decor', icon: 'frame', color: '#F97316', subs: ['Wall Art & Frames', 'Lighting', 'Pillows & Throws', 'Vases & Accents'] },
  { name: 'Kitchen & Dining', from: 'Kitchen', icon: 'utensils', color: '#F59E0B', subs: ['Cookware', 'Bakeware', 'Small Appliances', 'Dishes & Glassware', 'Utensils & Gadgets', 'Food Storage', 'Entertaining'] },
  { name: 'Linens & Bedding', icon: 'bed', color: '#0EA5E9', subs: ['Sheets', 'Blankets & Quilts', 'Towels', 'Curtains'] },
  { name: 'Clothing & Accessories', from: 'Clothing', icon: 'shirt', color: '#EC4899', subs: ['Adult', 'Kids', 'Shoes', 'Outerwear & Winter', 'Costumes & Dress-Up', 'Bags'] },
  { name: 'Kids & Baby', from: 'Kids & Toys', icon: 'baby', color: '#A855F7', subs: ['Toys', 'Games & Puzzles', 'Baby Gear', 'School Supplies', 'Kids Keepsakes'] },
  { name: 'Books & Media', icon: 'book-open', color: '#10B981', subs: ['Books', 'Movies & Music', 'Video Games'] },
  { name: 'Games & Tabletop', icon: 'dice', color: '#7C3AED', subs: ['Board Games', 'Puzzles', 'Miniatures & Wargaming', 'Role-Playing Games', 'Trading Card Games'] },
  { name: 'Electronics & Tech', from: 'Electronics', icon: 'monitor', color: '#3B82F6', subs: ['Computers & Parts', 'Cables & Chargers', 'Networking & Homelab', 'Audio & Video', 'Cameras', 'Batteries'] },
  { name: '3D Printing & Maker', icon: 'printer', color: '#0891B2', subs: ['Filament', 'Printer Parts', 'Electronics Projects'] },
  { name: 'Arts & Crafts', icon: 'palette', color: '#DB2777', subs: ['Yarn & Knitting', 'Sewing', 'Painting & Drawing', 'Paper Crafts'] },
  { name: 'Tools & Hardware', from: 'Tools', icon: 'wrench', color: '#6B7280', subs: ['Hand Tools', 'Power Tools', 'Fasteners & Hardware', 'Woodworking', 'Automotive', 'Paint Supplies'] },
  { name: 'Camping & Outdoors', icon: 'tent', color: '#15803D', subs: ['Camping Gear', 'Hiking', 'Fishing & Hunting'] },
  { name: 'Sports & Recreation', from: 'Sports & Outdoor', icon: 'bike', color: '#14B8A6', subs: ['Balls & Games', 'Bikes', 'Water & Pool', 'Winter Sports', 'Fitness'] },
  { name: 'Yard & Garden', icon: 'sprout', color: '#65A30D', subs: ['Garden Tools', 'Pots & Planters', 'Outdoor Decor'] },
  { name: 'Household Supplies', icon: 'spray-can', color: '#64748B', subs: ['Cleaning', 'Laundry', 'Paper Goods', 'Light Bulbs'] },
  { name: 'Bath & Personal Care', icon: 'bath', color: '#06B6D4', subs: ['Toiletries', 'Hair Care', 'Towels & Bath Accessories'] },
  { name: 'Health & First Aid', icon: 'heart-pulse', color: '#E11D48', subs: ['Medicine', 'First Aid', 'Medical Equipment'] },
  { name: 'Emergency & Preparedness', icon: 'siren', color: '#B91C1C', subs: ['72-Hour Kits', 'Food Storage', 'Water', 'Emergency Gear'] },
  { name: 'Office & Documents', icon: 'folder', color: '#475569', subs: ['Important Documents', 'Office Supplies', 'Stationery'] },
  { name: 'Keepsakes & Collectibles', icon: 'star', color: '#CA8A04', subs: ['Photos & Albums', 'Heirlooms', 'Kids Artwork', 'Sports Cards & Memorabilia', 'Coins'] },
  { name: 'Furniture', icon: 'sofa', color: '#8B5CF6', subs: ['Indoor', 'Outdoor', 'Disassembled Parts'] },
  { name: 'Miscellaneous', icon: 'box', color: '#78716C', subs: [] },
];

// ── Locations (SPEC.md "Locations") ──────────────────────────
// Place › Area › Spot. `floor` is kept as a descriptive attribute.
// Numbering (decided): Shelf 1 = bottom; racks numbered left → right.
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const pad = (n) => String(n).padStart(2, '0');

const LOCATIONS = [
  {
    name: '1642 W Blue Flax Dr', kind: 'PLACE', shortCode: 'BF', color: '#1D4ED8',
    notes: 'Rental home, Saratoga Springs, UT 84045.',
    children: [
      { name: 'Garage', kind: 'AREA', shortCode: 'BF-GAR', floor: 'Main Floor', color: '#374151',
        children: [
          ...range(9).map((n) => ({ name: `Overhead Shelf ${n}`, kind: 'SPOT', shortCode: `BF-GAR-HS${pad(n)}` })),
          { name: 'Garage Floor', kind: 'SPOT', shortCode: 'BF-GAR-FL' },
        ] },
      { name: 'Kitchen', kind: 'AREA', shortCode: 'BF-KIT', floor: 'Main Floor', color: '#8B4513' },
      { name: 'Pantry', kind: 'AREA', shortCode: 'BF-PAN', floor: 'Main Floor', color: '#8B4513' },
      { name: '3D Printer Area', kind: 'AREA', shortCode: 'BF-3DP', floor: 'Basement', color: '#2563EB' },
      { name: 'Under Stairs Storage', kind: 'AREA', shortCode: 'BF-UST', floor: 'Basement', color: '#2563EB' },
      { name: 'James Office', kind: 'AREA', shortCode: 'BF-JOF', floor: '2nd Floor', color: '#7C2D3B', notes: 'Bedroom 4 on the floor plan.',
        children: [{ name: 'James Hobby Desk', kind: 'SPOT', shortCode: 'BF-JHD', notes: "The office's closet." }] },
      { name: "Theo's Room", kind: 'AREA', shortCode: 'BF-THR', floor: '2nd Floor', color: '#2D6A4F', notes: 'Bedroom 3 on the floor plan.',
        children: [{ name: "Theo's Closet", kind: 'SPOT', shortCode: 'BF-THC' }] },
      { name: "Sophie's Room", kind: 'AREA', shortCode: 'BF-SOR', floor: '2nd Floor', color: '#9B7FD4', notes: 'Bedroom 2 on the floor plan.',
        children: [{ name: "Sophie's Closet", kind: 'SPOT', shortCode: 'BF-SOC' }] },
      { name: 'Master Bedroom', kind: 'AREA', shortCode: 'BF-MBR', floor: '2nd Floor', color: '#1B3A6B', notes: "Owner's Suite on the floor plan.",
        children: [{ name: 'Master Closet', kind: 'SPOT', shortCode: 'BF-MCL' }] },
      { name: 'Master Bath', kind: 'AREA', shortCode: 'BF-MBA', floor: '2nd Floor', color: '#6B7280' },
      { name: 'Kids Bathroom', kind: 'AREA', shortCode: 'BF-KBA', floor: '2nd Floor', color: '#6B7280', notes: 'Bath 2 on the floor plan.' },
    ],
  },
  {
    name: 'Lehi Indoor Storage — Unit 3204', kind: 'PLACE', shortCode: 'U', color: '#B45309',
    notes: '10×10 unit with 6 wire racks. Racks numbered left → right; Shelf 1 = bottom (5 shelves incl. top). ~2 × 27 gal totes per shelf.',
    children: [
      ...range(6).map((r) => ({
        name: `Rack ${r}`, kind: 'AREA', shortCode: `U-R${r}`,
        children: range(5).map((s) => ({ name: `Shelf ${s}`, kind: 'SPOT', shortCode: `U-R${r}-S${s}` })),
      })),
      { name: 'Unit Floor', kind: 'AREA', shortCode: 'U-FL' },
    ],
  },
];

// ── Kept totes (from "Tote Inventory Intake Form (Responses) - Sheet6.csv") ─
// Numbers honor the physical labels already on the totes. Brand/colors are
// best guesses from v1 data — confirm on the phone.
const KEPT_CONTAINERS = [
  { label: 'BXS-0001', number: 1, model: ['Generic', 'Cardboard Box'], category: ['Books & Media', 'Books'] },
  { label: 'T27-0010', number: 10, model: ['HDX', '27 Gal Tough Storage Tote'], category: ['Games & Tabletop', 'Miniatures & Wargaming'] },
  { label: 'T27-0011', number: 11, model: ['HDX', '27 Gal Tough Storage Tote'], category: ['Games & Tabletop', null] },
  { label: 'T27-0012', number: 12, model: ['HDX', '27 Gal Tough Storage Tote'], category: ['Games & Tabletop', 'Role-Playing Games'] },
  { label: 'T27-0013', number: 13, model: ['HDX', '27 Gal Tough Storage Tote'], category: ['Games & Tabletop', null] },
  { label: 'T27-0020', number: 20, model: ['HDX', '27 Gal Tough Storage Tote'], lidColor: 'Red', category: ['Games & Tabletop', 'Trading Card Games'] },
  { label: 'T27-0021', number: 21, model: ['HDX', '27 Gal Tough Storage Tote'], lidColor: 'Red', category: null },
];

async function applyReferenceData(prisma, log = console.log) {
  const summary = {};

  // 1. Tote models
  let created = 0;
  for (const m of CONTAINER_MODELS) {
    const existing = await prisma.containerModel.findUnique({ where: { brand_name: { brand: m.brand, name: m.name } } });
    if (!existing) { await prisma.containerModel.create({ data: m }); created++; }
  }
  summary.containerModelsCreated = created;

  // 2. Categories — rename v1 names in place, then find-or-create the tree.
  const catIds = {};
  let renamed = 0, catsCreated = 0;
  for (const [i, c] of CATEGORIES.entries()) {
    let top = await prisma.category.findFirst({ where: { name: c.name, parentId: null } });
    if (!top && c.from) {
      const old = await prisma.category.findFirst({ where: { name: c.from, parentId: null } });
      if (old) { top = await prisma.category.update({ where: { id: old.id }, data: { name: c.name } }); renamed++; }
    }
    if (!top) { top = await prisma.category.create({ data: { name: c.name, icon: c.icon, color: c.color, sortOrder: i } }); catsCreated++; }
    else if (top.sortOrder !== i) { await prisma.category.update({ where: { id: top.id }, data: { sortOrder: i } }); }
    catIds[c.name] = { id: top.id, subs: {} };
    for (const [j, sub] of c.subs.entries()) {
      let child = await prisma.category.findFirst({ where: { name: sub, parentId: top.id } });
      if (!child) { child = await prisma.category.create({ data: { name: sub, parentId: top.id, icon: c.icon, color: c.color, sortOrder: j } }); catsCreated++; }
      catIds[c.name].subs[sub] = child.id;
    }
  }
  summary.categoriesRenamed = renamed;
  summary.categoriesCreated = catsCreated;

  // 3. Archive v1 move rooms (Eagle Mountain origin + NC destination placeholders).
  const archived = await prisma.location.updateMany({
    where: { kind: null, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  summary.v1LocationsArchived = archived.count;

  // 4. Location tree (matched by shortCode, so renames in the app survive re-runs).
  let locsCreated = 0;
  const locIds = {};
  async function upsertLocation(node, parentId, sortOrder) {
    let loc = await prisma.location.findUnique({ where: { shortCode: node.shortCode } });
    if (!loc) {
      loc = await prisma.location.create({
        data: {
          name: node.name, kind: node.kind, shortCode: node.shortCode, parentId,
          floor: node.floor ?? null, notes: node.notes ?? null,
          color: node.color ?? '#6B7280', sortOrder,
        },
      });
      locsCreated++;
    }
    locIds[node.shortCode] = loc.id;
    for (const [i, child] of (node.children || []).entries()) await upsertLocation(child, loc.id, i);
  }
  for (const [i, place] of LOCATIONS.entries()) await upsertLocation(place, null, i);
  summary.locationsCreated = locsCreated;

  // 5. Kept totes: number, model, colors, status, and item categories.
  let numbered = 0, recategorized = 0;
  for (const k of KEPT_CONTAINERS) {
    const container = await prisma.container.findUnique({ where: { label: k.label } });
    if (!container) continue; // fresh install — nothing to number
    const model = await prisma.containerModel.findUnique({ where: { brand_name: { brand: k.model[0], name: k.model[1] } } });
    if (container.number == null) {
      await prisma.container.update({
        where: { id: container.id },
        data: {
          number: k.number,
          modelId: model?.id ?? null,
          lidColor: k.lidColor ?? container.lidColor,
          // Packed and sitting somewhere; the spot is set during the walkthrough.
          status: 'STORED',
        },
      });
      numbered++;
    }
    if (k.category) {
      const [topName, subName] = k.category;
      const target = subName ? catIds[topName].subs[subName] : catIds[topName].id;
      const misc = catIds['Miscellaneous'].id;
      // Only move items still sitting in Miscellaneous (the April import's
      // fallback) — never override a category someone chose deliberately.
      const placements = await prisma.itemPlacement.findMany({
        where: { containerId: container.id, removedAt: null },
        select: { itemId: true },
      });
      const r = await prisma.item.updateMany({
        where: { id: { in: placements.map((p) => p.itemId) }, categoryId: misc },
        data: { categoryId: target },
      });
      recategorized += r.count;
    }
  }
  summary.containersNumbered = numbered;
  summary.itemsRecategorized = recategorized;

  log('v2 reference data applied:', JSON.stringify(summary));
  return summary;
}

module.exports = { applyReferenceData, CONTAINER_MODELS, CATEGORIES, LOCATIONS, KEPT_CONTAINERS };

if (require.main === module) {
  const prisma = new PrismaClient();
  applyReferenceData(prisma)
    .catch((e) => { console.error('FAILED:', e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
