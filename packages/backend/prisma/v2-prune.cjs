// Stash v2 one-time prune — keep all books + the 7 known totes (and what's
// in them); permanently delete every other non-book item and container.
// Decided 2026-09-28 (SPEC.md "Existing data"). Books are left untouched.
//
// SAFE BY DEFAULT: without CONFIRM=yes this is a dry run that only prints
// what would be deleted. Take a pg_dump backup before running for real.
//
//   Dry run:  docker exec -w /app/packages/backend stash-backend node prisma/v2-prune.cjs
//   Execute:  docker exec -w /app/packages/backend -e CONFIRM=yes stash-backend node prisma/v2-prune.cjs
//
// Hard delete: item_placements, containers, checkouts, and book_details rows
// cascade with their item (onDelete: Cascade in schema.prisma). An
// activity-log entry records what was removed and by whom.

const { PrismaClient } = require('@prisma/client');
const { KEPT_CONTAINERS } = require('./v2-reference-data.cjs');

async function main() {
  const prisma = new PrismaClient();
  const execute = process.env.CONFIRM === 'yes';
  try {
    const keptLabels = KEPT_CONTAINERS.map((k) => k.label);
    const kept = await prisma.container.findMany({
      where: { label: { in: keptLabels } },
      select: { id: true, itemId: true, label: true },
    });
    if (kept.length !== keptLabels.length) {
      const found = kept.map((k) => k.label);
      throw new Error(`Expected ${keptLabels.length} kept containers, found ${kept.length}. Missing: ${keptLabels.filter((l) => !found.includes(l)).join(', ')}. Aborting.`);
    }
    const keptContainerIds = kept.map((k) => k.id);
    const keptContainerItemIds = kept.map((k) => k.itemId);

    // Items currently inside a kept container.
    const keptPlacements = await prisma.itemPlacement.findMany({
      where: { containerId: { in: keptContainerIds }, removedAt: null },
      select: { itemId: true },
    });
    const keepIds = new Set([...keptContainerItemIds, ...keptPlacements.map((p) => p.itemId)]);

    // Everything that is not a book and not kept.
    const candidates = await prisma.item.findMany({
      where: { bookDetails: null },
      select: { id: true, name: true, isContainer: true, container: { select: { label: true } } },
      orderBy: { name: 'asc' },
    });
    const toDelete = candidates.filter((i) => !keepIds.has(i.id));

    const containers = toDelete.filter((i) => i.isContainer);
    const items = toDelete.filter((i) => !i.isContainer);
    console.log(`Keeping ${kept.length} containers (${keptLabels.join(', ')}) and ${keepIds.size - kept.length} items inside them, plus all books.`);
    console.log(`${execute ? 'DELETING' : 'Would delete'} ${items.length} items and ${containers.length} containers:`);
    for (const c of containers) console.log(`  [container] ${c.container?.label ?? ''} ${c.name}`);
    for (const i of items) console.log(`  ${i.name}`);

    if (!execute) {
      console.log('\nDry run — nothing deleted. Re-run with CONFIRM=yes to delete.');
      return;
    }

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
    await prisma.$transaction(async (tx) => {
      const res = await tx.item.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });
      if (admin) {
        await tx.activityLog.create({
          data: {
            userId: admin.id,
            action: 'BULK_DELETE',
            entityType: 'Item',
            entityId: 'v2-prune',
            previousValue: { count: res.count, names: toDelete.map((i) => i.name) },
          },
        });
      }
      console.log(`\nDeleted ${res.count} rows (items + containers).`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; });
