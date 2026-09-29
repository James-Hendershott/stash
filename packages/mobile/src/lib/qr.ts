/**
 * Decode what a scanned Stash QR code points at.
 *
 * Formats we accept (newest first):
 *   https://stash.shottsserver.com/c/12        → container #12   (v2 labels)
 *   https://stash.shottsserver.com/i/<uuid>    → item            (v2 labels)
 *   …/api/containers/<uuid>                    → container by id (v1 labels)
 *   …/api/items/<uuid>                         → item by id      (v1 labels)
 *   12 or #12                                  → container #12   (typed / plain)
 */
export type StashCode =
  | { kind: 'container'; number: number }
  | { kind: 'container'; id: string }
  | { kind: 'item'; id: string };

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export function parseStashCode(raw: string): StashCode | null {
  const data = raw.trim();

  let m = data.match(/\/c\/(\d+)\b/i);
  if (m) return { kind: 'container', number: Number(m[1]) };

  m = data.match(new RegExp(`\\/i\\/(${UUID})`, 'i'));
  if (m) return { kind: 'item', id: m[1].toLowerCase() };

  m = data.match(new RegExp(`\\/containers\\/(${UUID})`, 'i'));
  if (m) return { kind: 'container', id: m[1].toLowerCase() };

  m = data.match(new RegExp(`\\/items\\/(${UUID})`, 'i'));
  if (m) return { kind: 'item', id: m[1].toLowerCase() };

  m = data.match(/^#?(\d{1,6})$/);
  if (m) return { kind: 'container', number: Number(m[1]) };

  return null;
}
