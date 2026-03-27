/**
 * CSV Import Service
 *
 * Parses CSV text into rows, maps columns to Stash item fields,
 * and creates items in batch via Prisma.
 */

import { prisma } from '../lib/prisma';

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
): Promise<{ created: number; errors: { row: number; message: string }[] }> {
  // Pre-fetch categories and locations for name-to-ID lookups
  const categories = await prisma.category.findMany();
  const locations = await prisma.location.findMany();

  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const locationMap = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));

  // Defaults
  const defaultCategoryId = categories[0]?.id;
  const defaultLocationId = locations.find((l) => l.type === 'ORIGIN')?.id || locations[0]?.id;

  let created = 0;
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

      await prisma.item.create({
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
      newValue: { created, errors: errors.length },
    },
  });

  return { created, errors };
}
