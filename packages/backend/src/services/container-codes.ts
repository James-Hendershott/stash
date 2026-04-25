/**
 * Container code generation.
 *
 * Format: {PREFIX}-{NNNN}  e.g. T27-0012, BXS-0001, UBX-0001.
 *
 * Codes are unique across the database (Container.label has a unique
 * constraint). Each ContainerType has its own sequence, padded to 4
 * digits. The friendly description lives on Item.description; the code
 * is the immutable identifier (QR codes encode it).
 *
 * Two helpers exposed:
 *
 *   nextContainerCode(type)
 *     → returns the lowest unused code for the given type.
 *
 *   parseLegacyLabel(label)
 *     → tries to interpret a free-text label like "Tote #12" or
 *       "Book Box #1" as a (type, number) hint, used by the CSV import
 *       to honor the user's existing physical labels when possible.
 */
import { Prisma, ContainerType } from '@prisma/client';
import { CONTAINER_CODE_PREFIX } from '@stash/shared';

const PAD = 4;

function format(type: ContainerType, n: number): string {
  return `${CONTAINER_CODE_PREFIX[type]}-${String(n).padStart(PAD, '0')}`;
}

const CODE_REGEX = /^([A-Z]{2,3})-(\d+)$/;

function parseCode(code: string): { prefix: string; n: number } | null {
  const match = code.match(CODE_REGEX);
  if (!match) return null;
  return { prefix: match[1], n: parseInt(match[2], 10) };
}

/**
 * Find the lowest unused sequence number for the given container type.
 * If `preferredNumber` is given and that slot is free, use it; otherwise
 * fall through to the next available number.
 */
export async function nextContainerCode(
  tx: Prisma.TransactionClient,
  type: ContainerType,
  preferredNumber?: number,
): Promise<{ code: string; usedPreferred: boolean }> {
  const prefix = CONTAINER_CODE_PREFIX[type];
  const used = await tx.container.findMany({
    where: { label: { startsWith: `${prefix}-` } },
    select: { label: true },
  });

  const usedNumbers = new Set<number>();
  for (const row of used) {
    const parsed = parseCode(row.label);
    if (parsed && parsed.prefix === prefix) usedNumbers.add(parsed.n);
  }

  if (preferredNumber !== undefined && preferredNumber > 0 && !usedNumbers.has(preferredNumber)) {
    return { code: format(type, preferredNumber), usedPreferred: true };
  }

  let n = 1;
  while (usedNumbers.has(n)) n++;
  return { code: format(type, n), usedPreferred: false };
}

/**
 * Try to interpret a free-text legacy label as a (type, number) hint.
 *
 * Recognized inputs include:
 *   "Tote #12"             → TOTE_27GAL, 12
 *   "Tote #20 (Red)"       → TOTE_27GAL, 20
 *   "Tote #21(Red)"        → TOTE_27GAL, 21
 *   "Large Tote #01"       → TOTE_35GAL, 1
 *   "Book Box #1"          → BOX_SMALL, 1
 *   "Bin #03"              → BOX_SMALL, 3   (bins are typically small boxes)
 *   "Suitcase #1"          → CUSTOM, 1
 *   "Uhaul Unit #AA5929N"  → UBOX, (no preferred number — alphanumeric ID)
 *
 * Returns null if no type can be inferred. The caller should fall back
 * to creating with a default type and no preferred number.
 */
export function parseLegacyLabel(label: string): {
  type: ContainerType;
  preferredNumber?: number;
  description: string;
} | null {
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();

  // Try to extract a leading number after a hash, ignoring trailing notes
  // in parens.
  const numberMatch = trimmed.match(/#\s*(\d+)/);
  const num = numberMatch ? parseInt(numberMatch[1], 10) : undefined;

  const description = trimmed; // preserve the original verbatim for Item.description

  if (lower.startsWith('large tote')) {
    return { type: ContainerType.TOTE_35GAL, preferredNumber: num, description };
  }
  if (lower.startsWith('tote')) {
    return { type: ContainerType.TOTE_27GAL, preferredNumber: num, description };
  }
  if (lower.startsWith('book box')) {
    return { type: ContainerType.BOX_SMALL, preferredNumber: num, description };
  }
  if (lower.startsWith('bin')) {
    return { type: ContainerType.BOX_SMALL, preferredNumber: num, description };
  }
  if (lower.startsWith('suitcase')) {
    return { type: ContainerType.CUSTOM, preferredNumber: num, description };
  }
  if (lower.startsWith('uhaul') || lower.startsWith('u-haul') || lower.startsWith('u-box') || lower.startsWith('ubox')) {
    return { type: ContainerType.UBOX, description };
  }

  return null;
}
