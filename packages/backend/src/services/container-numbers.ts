/**
 * Container ID counter — ADR-012.
 *
 * Every tote gets a number from one counter stored in the `settings` table
 * (key `container.nextNumber`). The counter only ever goes up, so a number
 * is never reused even if its tote is deleted — a printed label can never
 * end up pointing at a different tote.
 *
 * Atomicity: the UPDATE … RETURNING runs as a single SQL statement, so two
 * phones assigning at the same moment can't get the same number (Postgres
 * row-locks the settings row for the duration of the update).
 */
import type { Prisma } from '@prisma/client';

export const NEXT_NUMBER_KEY = 'container.nextNumber';

type Tx = Prisma.TransactionClient;

/** Take the next free container number (and advance the counter). */
export async function takeNextContainerNumber(tx: Tx): Promise<number> {
  // Make sure the counter exists (first ever use starts at 1).
  await tx.$executeRaw`
    INSERT INTO settings (key, value, "updatedAt") VALUES (${NEXT_NUMBER_KEY}, '1', now())
    ON CONFLICT (key) DO NOTHING`;

  // Skip any number that's somehow already taken (e.g. set by hand).
  for (let attempt = 0; attempt < 1000; attempt++) {
    const rows = await tx.$queryRaw<{ n: number }[]>`
      UPDATE settings
         SET value = (value::int + 1)::text, "updatedAt" = now()
       WHERE key = ${NEXT_NUMBER_KEY}
   RETURNING (value::int - 1) AS n`;
    const n = Number(rows[0].n);
    const taken = await tx.container.findUnique({ where: { number: n }, select: { id: true } });
    if (!taken) return n;
  }
  throw new Error('Could not find a free container number');
}
