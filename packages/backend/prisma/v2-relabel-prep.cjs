// Stash v2 relabel prep (ADR-012, 2026-10-01).
//
// James chose uniform IDs ("#001") assigned AS EACH TOTE IS RELABELED.
// The existing totes still carry old handwritten numbers (#1, #10–13, #20,
// #21, #50) that would collide with the new sequence, so:
//   - each existing numbered tote → number cleared, label set to "Old #<n>"
//     (what's written on it today), so the app and the tote still agree;
//   - the never-reused counter `container.nextNumber` starts at 1.
// Totes then get a real ID from the phone ("Assign new ID") when relabeled.
//
// ONE-TIME and guarded: records `relabel.prepDone` in settings and does
// nothing on later runs. Non-destructive (no rows deleted).
//
//   docker exec -w /app/packages/backend stash-backend node prisma/v2-relabel-prep.cjs

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const done = await prisma.setting.findUnique({ where: { key: 'relabel.prepDone' } });
    if (done) {
      console.log(`Relabel prep already done (${done.value}) — nothing to do.`);
      return;
    }
    const numbered = await prisma.container.findMany({
      where: { number: { not: null } },
      select: { id: true, number: true, label: true },
      orderBy: { number: 'asc' },
    });

    await prisma.$transaction(async (tx) => {
      for (const c of numbered) {
        await tx.container.update({
          where: { id: c.id },
          data: { number: null, label: `Old #${c.number}`, labelStatus: 'NONE' },
        });
      }
      await tx.setting.upsert({
        where: { key: 'container.nextNumber' },
        update: {},
        create: { key: 'container.nextNumber', value: '1' },
      });
      await tx.setting.create({ data: { key: 'relabel.prepDone', value: new Date().toISOString() } });
    });

    console.log(`Moved ${numbered.length} totes to their old labels: ${numbered.map((c) => `Old #${c.number} (was ${c.label})`).join(', ')}`);
    console.log('New IDs start at #001.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; });
