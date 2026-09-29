/**
 * CSV Import Service
 *
 * Parses CSV text into rows, maps columns to Stash item fields,
 * and creates items in batch via Prisma.
 */

import { Prisma, ContainerType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CONTAINER_DEFAULTS } from '@stash/shared';
import { nextContainerCode, parseLegacyLabel } from './container-codes';

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

/**
 * Parse raw CSV text into headers and rows.
 * Handles quoted fields, commas inside quotes, and newlines in quotes.
 */
export function parseCsv(text: string): CsvParseResult {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        current.push(field.trim());
        if (current.some((f) => f.length > 0)) lines.push(current);
        current = [];
        field = '';
        if (ch === '\r') i++; // skip \n in \r\n
      } else {
        field += ch;
      }
    }
  }

  // Last field/row
  current.push(field.trim());
  if (current.some((f) => f.length > 0)) lines.push(current);

  const headers = lines[0] || [];
  const rows = lines.slice(1);

  return { headers, rows, rowCount: rows.length };
}

/**
 * Stash fields that CSV columns can be mapped to.
 */
export const IMPORTABLE_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'categoryName', label: 'Category', required: false },
  { key: 'condition', label: 'Condition', required: false },
  { key: 'quantity', label: 'Quantity', required: false },
  { key: 'fate', label: 'Fate', required: false },
  { key: 'originLocationName', label: 'Origin Room', required: false },
  { key: 'containerLabel', label: 'Container', required: false },
  { key: 'lengthIn', label: 'Length (in)', required: false },
  { key: 'widthIn', label: 'Width (in)', required: false },
  { key: 'heightIn', label: 'Height (in)', required: false },
  { key: 'weightLbs', label: 'Weight (lbs)', required: false },
  { key: 'estimatedSaleValue', label: 'Est. Sale Value', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

/**
 * Column mapping: CSV column index → Stash field key
 */
export interface ColumnMapping {
  [csvColumnIndex: number]: string; // e.g., { 0: 'name', 2: 'categoryName' }
}

/**
 * Import CSV rows using the given column mapping.
 * Returns the count of created items and any row-level errors.
 */
export async function importCsvRows(
  rows: string[][],
  mapping: ColumnMapping,
  userId: string,
): Promise<{
  created: number;
  placed: number;
  containersCreated: number;
  errors: { row: number; message: string }[];
}> {
  // Pre-fetch categories and locations for name-to-ID lookups
  const categories = await prisma.category.findMany();
  const locations = await prisma.location.findMany();

  const categoryMap = new Map(categories.map((c: { name: string; id: string }) => [c.name.toLowerCase(), c.id]));
  const locationMap = new Map(locations.map((l: { name: string; id: string }) => [l.name.toLowerCase(), l.id]));

  // Defaults
  const defaultCategoryId = categories[0]?.id;
  const defaultLocationId = locations.find((l: { type: string | null }) => l.type === 'ORIGIN')?.id || locations[0]?.id;

  // Cache containers we've already resolved or created during this import
  // so multiple items in the same Tote share one DB lookup.
  const containerCache = new Map<string, string>(); // legacy-or-code → container.id

  let created = 0;
  let placed = 0;
  let containersCreated = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Extract mapped values
      const getValue = (fieldKey: string): string | undefined => {
        const colIdx = Object.entries(mapping).find(([, v]) => v === fieldKey)?.[0];
        if (colIdx === undefined) return undefined;
        return row[parseInt(colIdx)];
      };

      const name = getValue('name');
      if (!name) {
        errors.push({ row: i + 2, message: 'Name is required' }); // +2 for 1-indexed + header
        continue;
      }

      // Resolve category name to ID
      const catName = getValue('categoryName');
      const categoryId = catName ? categoryMap.get(catName.toLowerCase()) || defaultCategoryId : defaultCategoryId;

      // Resolve location name to ID
      const locName = getValue('originLocationName');
      const originLocationId = locName ? locationMap.get(locName.toLowerCase()) || defaultLocationId : defaultLocationId;

      // Validate enum values
      const condition = (['GOOD', 'FAIR', 'POOR'].includes(getValue('condition')?.toUpperCase() || '') ? getValue('condition')!.toUpperCase() : 'GOOD') as any;
      const fate = (['KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED'].includes(getValue('fate')?.toUpperCase() || '') ? getValue('fate')!.toUpperCase() : 'UNDECIDED') as any;

      // Resolve (or auto-create) the container *before* the item so the
      // placement can happen in the same transaction.
      const containerLabelRaw = getValue('containerLabel')?.trim();
      let containerId: string | undefined;
      let containerCreatedThisRow = false;

      if (containerLabelRaw) {
        const cached = containerCache.get(containerLabelRaw.toLowerCase());
        if (cached) {
          containerId = cached;
        } else {
          const resolved = await resolveOrCreateContainer(
            containerLabelRaw,
            originLocationId!,
            categoryId!,
            userId,
          );
          containerId = resolved.id;
          containerCreatedThisRow = resolved.created;
          containerCache.set(containerLabelRaw.toLowerCase(), resolved.id);
        }
      }

      await prisma.$transaction(async (tx) => {
        const item = await tx.item.create({
          data: {
            name,
            description: getValue('description') || null,
            categoryId: categoryId!,
            condition,
            quantity: parseInt(getValue('quantity') || '1') || 1,
            fate,
            originLocationId: originLocationId!,
            lengthIn: parseFloat(getValue('lengthIn') || '') || null,
            widthIn: parseFloat(getValue('widthIn') || '') || null,
            heightIn: parseFloat(getValue('heightIn') || '') || null,
            weightLbs: parseFloat(getValue('weightLbs') || '') || null,
            estimatedSaleValue: parseFloat(getValue('estimatedSaleValue') || '') || null,
            notes: getValue('notes') || null,
            addedById: userId,
            lastModifiedById: userId,
          },
        });

        if (containerId) {
          await tx.itemPlacement.create({
            data: { itemId: item.id, containerId, placedById: userId },
          });
          placed++;
        }
      });

      if (containerCreatedThisRow) containersCreated++;
      created++;
    } catch (err: any) {
      errors.push({ row: i + 2, message: err.message });
    }
  }

  // Log the import activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'IMPORT_CSV',
      entityType: 'Item',
      entityId: 'batch',
      newValue: { created, placed, containersCreated, errors: errors.length },
    },
  });

  return { created, placed, containersCreated, errors };
}

/**
 * Find a container by exact label match, or parse a legacy label like
 * "Tote #12" / "Book Box #1" and either find or create the matching
 * container with an auto-generated code.
 *
 * Returns { id, created } so the caller can count auto-creations.
 */
export async function resolveOrCreateContainer(
  rawLabel: string,
  fallbackOriginLocationId: string,
  fallbackCategoryId: string,
  userId: string,
): Promise<{ id: string; created: boolean }> {
  // Exact match against existing label (already a code or pre-existing
  // free text from a previous version of the data).
  const exact = await prisma.container.findUnique({ where: { label: rawLabel } });
  if (exact) return { id: exact.id, created: false };

  // Try legacy parse: "Tote #12" → TOTE_27GAL, 12.
  const parsed = parseLegacyLabel(rawLabel);
  if (!parsed) {
    // We can't infer a type — auto-create as CUSTOM with the literal
    // label as description so nothing gets lost.
    return await createContainerWithCode(
      ContainerType.CUSTOM,
      undefined,
      rawLabel,
      fallbackOriginLocationId,
      fallbackCategoryId,
      userId,
    );
  }

  // If the parsed code (e.g. T27-0012) already exists, reuse it.
  const result = await prisma.$transaction(async (tx) => {
    const { code } = await nextContainerCode(tx, parsed.type, parsed.preferredNumber);
    const existingByCode = await tx.container.findUnique({ where: { label: code } });
    if (existingByCode) return { id: existingByCode.id, created: false };

    return await createContainerInTx(
      tx,
      parsed.type,
      code,
      parsed.description,
      fallbackOriginLocationId,
      fallbackCategoryId,
      userId,
    );
  });

  return result;
}

async function createContainerWithCode(
  type: ContainerType,
  preferredNumber: number | undefined,
  description: string,
  originLocationId: string,
  categoryId: string,
  userId: string,
): Promise<{ id: string; created: boolean }> {
  return await prisma.$transaction(async (tx) => {
    const { code } = await nextContainerCode(tx, type, preferredNumber);
    return await createContainerInTx(tx, type, code, description, originLocationId, categoryId, userId);
  });
}

async function createContainerInTx(
  tx: Prisma.TransactionClient,
  type: ContainerType,
  code: string,
  description: string,
  originLocationId: string,
  categoryId: string,
  userId: string,
): Promise<{ id: string; created: boolean }> {
  const defaults = CONTAINER_DEFAULTS[type] ?? CONTAINER_DEFAULTS.CUSTOM ?? {
    label: 'Container',
    lengthIn: 12,
    widthIn: 12,
    heightIn: 12,
    maxWeightLbs: 25,
  };

  const item = await tx.item.create({
    data: {
      name: code,
      description, // friendly text — the legacy label verbatim
      categoryId,
      originLocationId,
      isContainer: true,
      shapeType: 'BOX',
      lengthIn: defaults.lengthIn,
      widthIn: defaults.widthIn,
      heightIn: defaults.heightIn,
      addedById: userId,
      lastModifiedById: userId,
    },
  });

  const container = await tx.container.create({
    data: {
      itemId: item.id,
      containerType: type,
      label: code,
      internalLengthIn: defaults.lengthIn,
      internalWidthIn: defaults.widthIn,
      internalHeightIn: defaults.heightIn,
      maxWeightLbs: defaults.maxWeightLbs,
    },
  });

  return { id: container.id, created: true };
}
