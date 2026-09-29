// Stash v2 one-time unpack — take every item OUT of the old totes that
// aren't being kept, but KEEP the items (decided 2026-09-29, replacing the
// earlier "prune" plan). Kept totes: see KEPT_CONTAINERS in
// v2-reference-data.cjs (#1, #10–#13, #20, #21). Books are untouched.
//
// Unpacking sets `removedAt` on the active placement — the placement
// history is kept, so "this used to be in Suitcase #1" stays answerable.
// Unpacked items end up with no container and no location ("Location not
// set") until they're re-homed from the phone.
//
// SAFE BY DEFAULT: without CONFIRM=yes this only prints what it would do.
//
//   Dry run:  docker exec -w /app/packages/backend stash-backend node prisma/v2-unpack.cjs
//   Execute:  docker exec -w /app/packages/backend -e CONFIRM=yes stash-backend node prisma/v2-unpack.cjs
//
// DELETE_EMPTY_TOTES=yes also deletes the old tote *records* once they are
// empty (their items are kept). Only totes with nothing left in them are
// deleted. James chose this on 2026-09-29 ("start fresh with all containers").
//
// REMOVE_ITEMS: specific items James asked to remove entirely. Each is
// matched by id AND exact name, so a stale id can never delete the wrong row.

const { PrismaClient } = require('@prisma/client');
const { KEPT_CONTAINERS } = require('./v2-reference-data.cjs');

const REMOVE_ITEMS = [
  // Unknown entry from the April intake ("not sure what she meant") — 2026-09-29.
  { id: 'e9853031-098b-442c-b2ee-3db79fa4f643', name: 'Mommy and Baby Shark' },
];

async function main() {
  const prisma = new PrismaClient();
  const execute = process.env.CONFIRM === 'yes';
  const deleteEmpty = process.env.DELETE_EMPTY_TOTES === 'yes';
  try {
    const keptLabels = KEPT_CONTAINERS.map((k) => k.label);
    const kept = await prisma.container.findMany({ where: { label: { in: keptLabels } }, select: { id: true } });
    if (kept.length !== keptLabels.length) {
      throw new Error(`Expected ${keptLabels.length} kept containers, found ${kept.length}. Aborting.`);
    }

    const others = await prisma.container.findMany({
      where: { id: { notIn: kept.map((k) => k.id) }, item: { deletedAt: null } },
      include: {
        item: { select: { id: true, name: true, description: true } },
        placements: { where: { removedAt: null }, include: { item: { select: { name: true } } } },
      },
      orderBy: { label: 'asc' },
    });

    const placements = others.flatMap((c) => c.placements);
    console.log(`Keeping totes ${keptLabels.join(', ')} as they are.`);
    console.log(`${execute ? 'UNPACKING' : 'Would unpack'} ${placements.length} items from ${others.length} other totes (items are kept):`);
    for (const c of others) {
      console.log(`  ${c.label} ${c.item.description ?? c.item.name}: ${c.placements.length} item(s)`);
      for (const p of c.placements) console.log(`      - ${p.item.name}`);
    }
    if (deleteEmpty) console.log(`${execute ? 'DELETING' : 'Would delete'} the ${others.length} emptied tote records.`);
    else console.log('The emptied tote records are kept (set DELETE_EMPTY_TOTES=yes to delete them).');

    // Items to remove entirely — only if both id and name still match.
    const toRemove = [];
    for (const r of REMOVE_ITEMS) {
      const item = await prisma.item.findUnique({ where: { id: r.id }, select: { id: true, name: true } });
      if (!item) console.log(`  (already gone) ${r.name}`);
      else if (item.name !== r.name) console.log(`  SKIPPING ${r.id}: name is "${item.name}", expected "${r.name}"`);
      else toRemove.push(item);
    }
    for (const i of toRemove) console.log(`${execute ? 'REMOVING' : 'Would remove'} item: ${i.name}`);

    if (!execute) {
      console.log('\nDry run — nothing changed. Re-run with CONFIRM=yes to unpack.');
      return;
    }

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const unpacked = await tx.itemPlacement.updateMany({
        where: { id: { in: placements.map((p) => p.id) } },
        data: { removedAt: now, notes: 'v2 unpack (2026-09-29): tote retired, item kept' },
      });
      let deleted = 0;
      if (deleteEmpty) {
        // Only totes that are now empty — never one that still holds something.
        const empty = [];
        for (const c of others) {
          const stillIn = await tx.itemPlacement.count({ where: { containerId: c.id, removedAt: null } });
          if (stillIn === 0) empty.push(c.item.id);
        }
        const res = await tx.item.deleteMany({ where: { id: { in: empty } } });
        deleted = res.count;
      }
      const removed = await tx.item.deleteMany({ where: { id: { in: toRemove.map((i) => i.id) } } });
      if (admin) {
        await tx.activityLog.create({
          data: {
            userId: admin.id,
            action: 'BULK_UNPACK',
            entityType: 'Container',
            entityId: 'v2-unpack',
            previousValue: {
              totes: others.map((c) => ({ label: c.label, name: c.item.description ?? c.item.name, items: c.placements.map((p) => p.item.name) })),
            },
            newValue: {
              unpacked: unpacked.count,
              toteRecordsDeleted: deleted,
              itemsRemoved: toRemove.map((i) => i.name),
            },
          },
        });
      }
      console.log(`\nUnpacked ${unpacked.count} items. Deleted ${deleted} empty tote records. Removed ${removed.count} item(s).`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; });
