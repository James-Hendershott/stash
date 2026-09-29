/**
 * Whereabouts — answers "where is this thing?" (SPEC.md "Core model").
 *
 * The chain is Item → Container → Location, where containers can sit inside
 * other containers and locations form a tree (Place › Area › Spot). This
 * service resolves that chain into a readable path like:
 *
 *   In #12 · Lehi Indoor Storage — Unit 3204 › Rack 5 › Shelf 3
 *
 * Strategy: locations and containers are small tables (tens to hundreds of
 * rows), so we load each ONCE per request into a Map and walk the chains in
 * memory. That makes resolving N items O(N × depth) with a constant number
 * of queries — instead of one query per hop per item (the N+1 problem).
 */
import { prisma } from '../lib/prisma';

export interface LocationNode {
  id: string;
  name: string;
  shortCode: string | null;
  kind: string | null;
  parentId: string | null;
  archivedAt: Date | null;
}

export interface ContainerRef {
  id: string;
  itemId: string;
  number: number | null;
  label: string;
  locationId: string | null;
  /** The container this container is itself packed inside, if any. */
  parentContainerId: string | null;
}

export interface Whereabouts {
  status: string;
  /** Innermost container holding the item (null if not in one). */
  container: { id: string; number: number | null; label: string; display: string } | null;
  /** Resolved location — the item's own, or inherited from its container chain. */
  location: { id: string; path: string; shortCode: string | null } | null;
  /** One human sentence for list rows. */
  summary: string;
}

const MAX_DEPTH = 10; // guards against accidental cycles in data

export async function loadLocationIndex(): Promise<Map<string, LocationNode>> {
  const rows = await prisma.location.findMany({
    select: { id: true, name: true, shortCode: true, kind: true, parentId: true, archivedAt: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

/** Root-first list of nodes from the top Place down to `id`. */
export function locationPath(index: Map<string, LocationNode>, id: string | null): LocationNode[] {
  const path: LocationNode[] = [];
  let cur = id ? index.get(id) : undefined;
  for (let depth = 0; cur && depth < MAX_DEPTH; depth++) {
    path.unshift(cur);
    cur = cur.parentId ? index.get(cur.parentId) : undefined;
  }
  return path;
}

export function pathLabel(path: LocationNode[]): string {
  return path.map((n) => n.name).join(' › ');
}

export function containerDisplay(c: { number: number | null; label: string }): string {
  return c.number != null ? `#${c.number}` : c.label;
}

export async function loadContainerIndex(): Promise<Map<string, ContainerRef>> {
  const rows = await prisma.container.findMany({
    where: { item: { deletedAt: null } },
    select: {
      id: true, itemId: true, number: true, label: true, locationId: true,
      item: {
        select: {
          placements: { where: { removedAt: null }, select: { containerId: true }, take: 1 },
        },
      },
    },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id, itemId: r.itemId, number: r.number, label: r.label, locationId: r.locationId,
        parentContainerId: r.item.placements[0]?.containerId ?? null,
      },
    ]),
  );
}

/** A container's effective location: its own, else its parent container's (recursively). */
export function containerLocationId(containers: Map<string, ContainerRef>, containerId: string): string | null {
  let cur = containers.get(containerId);
  for (let depth = 0; cur && depth < MAX_DEPTH; depth++) {
    if (cur.locationId) return cur.locationId;
    cur = cur.parentContainerId ? containers.get(cur.parentContainerId) : undefined;
  }
  return null;
}

interface ItemForWhereabouts {
  id: string;
  status: string;
  locationId: string | null;
  isContainer: boolean;
}

/**
 * Resolve whereabouts for many items at once (2 queries for the indexes +
 * 1 for placements, regardless of how many items).
 */
export async function whereaboutsFor(items: ItemForWhereabouts[]): Promise<Map<string, Whereabouts>> {
  const [locations, containers] = await Promise.all([loadLocationIndex(), loadContainerIndex()]);

  const placements = await prisma.itemPlacement.findMany({
    where: { itemId: { in: items.map((i) => i.id) }, removedAt: null },
    select: { itemId: true, containerId: true },
  });
  const placedIn = new Map(placements.map((p) => [p.itemId, p.containerId]));
  const containerByItemId = new Map([...containers.values()].map((c) => [c.itemId, c]));

  const result = new Map<string, Whereabouts>();
  for (const item of items) {
    const parentId = placedIn.get(item.id) ?? null;
    const parent = parentId ? containers.get(parentId) ?? null : null;

    // Where does the location come from?
    //  - a container item: its own location, else the container it's packed in
    //  - a packed item: its container chain
    //  - a loose item: its own locationId
    let locId: string | null = null;
    if (item.isContainer) {
      const self = containerByItemId.get(item.id);
      locId = self ? containerLocationId(containers, self.id) : null;
    } else if (parent) {
      locId = containerLocationId(containers, parent.id);
    } else {
      locId = item.locationId;
    }

    const path = locationPath(locations, locId);
    const location = locId && path.length
      ? { id: locId, path: pathLabel(path), shortCode: path[path.length - 1].shortCode }
      : null;
    const container = parent
      ? { id: parent.id, number: parent.number, label: parent.label, display: containerDisplay(parent) }
      : null;

    const where = location ? location.path : 'location not set';
    let summary = container ? `In ${container.display} · ${where}` : location ? `At ${location.path}` : 'Location not set';
    if (item.status === 'IN_USE') summary = `Checked out — ${summary}`;
    if (item.status === 'ARCHIVED') summary = 'In regular use (archived)';

    result.set(item.id, { status: item.status, container, location, summary });
  }
  return result;
}

/** Convenience for one item. */
export async function whereaboutsForOne(item: ItemForWhereabouts): Promise<Whereabouts> {
  return (await whereaboutsFor([item])).get(item.id)!;
}
