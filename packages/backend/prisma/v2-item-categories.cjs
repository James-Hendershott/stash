// Stash v2 — apply per-item categories (reviewed 2026-09-29).
//
// Reads prisma/v2-item-categories.json:
//   items: { "<itemId>": ["Top category", "Subcategory" | null] }  — the 266 non-book items
//   books: ["Books & Media", "Books"]                               — every item with BookDetails
//
// IDEMPOTENT and non-destructive: only changes an item's categoryId when it
// differs. Run AFTER v2-reference-data.cjs (which creates the categories).
//
//   docker exec -w /app/packages/backend stash-backend node prisma/v2-item-categories.cjs

const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function applyItemCategories(prisma, log = console.log) {
  const data = require(path.join(__dirname, 'v2-item-categories.json'));

  // Resolve ["Top", "Sub"] → category id once per distinct pair.
  const cache = new Map();
  async function categoryId([top, sub]) {
    const key = `${top}›${sub ?? ''}`;
    if (cache.has(key)) return cache.get(key);
    const parent = await prisma.category.findFirst({ where: { name: top, parentId: null } });
    if (!parent) throw new Error(`Category "${top}" not found — run v2-reference-data.cjs first`);
    let id = parent.id;
    if (sub) {
      const child = await prisma.category.findFirst({ where: { name: sub, parentId: parent.id } });
      if (!child) throw new Error(`Subcategory "${top} › ${sub}" not found — run v2-reference-data.cjs first`);
      id = child.id;
    }
    cache.set(key, id);
    return id;
  }

  let changed = 0, unchanged = 0, missing = 0;
  for (const [itemId, pair] of Object.entries(data.items)) {
    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { categoryId: true } });
    if (!item) { missing++; continue; } // deleted since the review
    const target = await categoryId(pair);
    if (item.categoryId === target) { unchanged++; continue; }
    await prisma.item.update({ where: { id: itemId }, data: { categoryId: target } });
    changed++;
  }

  const booksTarget = await categoryId(data.books);
  const books = await prisma.item.updateMany({
    where: { bookDetails: { isNot: null }, categoryId: { not: booksTarget } },
    data: { categoryId: booksTarget },
  });

  const summary = { itemsChanged: changed, itemsUnchanged: unchanged, itemsMissing: missing, booksChanged: books.count };
  log('v2 item categories applied:', JSON.stringify(summary));
  return summary;
}

module.exports = { applyItemCategories };

if (require.main === module) {
  const prisma = new PrismaClient();
  applyItemCategories(prisma)
    .catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
