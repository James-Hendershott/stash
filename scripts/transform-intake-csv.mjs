#!/usr/bin/env node
/**
 * Transform the legacy "Tote Inventory Intake Form" Google Forms CSV
 * into Stash's import-ready files.
 *
 * Input:
 *   data/import/tote-inventory-intake.csv
 *
 * Output:
 *   data/import/book-input.txt  — pipe-delimited Title|Authors|ISBN,
 *                                 ready for scripts/enrich-books.mjs
 *   data/import/items.csv       — non-book items in /api/import/csv
 *                                 format with containerLabel + originLocationName
 *
 * Rules baked in based on the 2026-04-25 conversation:
 *
 *   - Book Box #1 rows (Books category, has ISBN) → book-input.txt
 *   - Stale containers (camping bins + bare-numbered totes) → items.csv
 *     with originLocation=Unsorted and no containerLabel
 *   - Real containers (Totes 10/11/12/13/20/21/30/31/33, Large Tote #01,
 *     Suitcases, Tote #03 Subaru) → items.csv with the original tote
 *     name as containerLabel; backend auto-resolves it to a code
 *
 *   - Stale containers list:
 *       Bin #01 Utensil, #02 Cleaning, #03 Batteries/Lights, #04 Toiletry
 *       Tote #04, #05, #06, #07 — Camping OUTSIDE/INSIDE TENT
 *       Tote #08 — also stale per user (mixed camping)
 *       Bare numbers 35–40 — wife's "hurry up" packing, no idea inside
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INPUT = resolve('data/import/tote-inventory-intake.csv');
const BOOK_OUT = resolve('data/import/book-input.txt');
const ITEMS_OUT = resolve('data/import/items.csv');

const STALE_CONTAINERS = new Set([
  'bin #01', 'bin #02', 'bin #03', 'bin #04',
  'tote #04', 'tote #05', 'tote #06', 'tote #07', 'tote #08',
  '35', '36', '37', '38', '39', '40',
]);

// Map the intake form's categories to the seeded Stash categories.
const CATEGORY_MAP = {
  'camping & outdoors': 'Camping & Outdoors',
  'camping & outdoor': 'Camping & Outdoors',
  'camping': 'Camping & Outdoors',
  'tech & media': 'Electronics',
  'electronics': 'Electronics',
  'books': 'Books & Media',
  'kitchen': 'Kitchen',
  'tools': 'Tools',
  'clothing': 'Clothing',
  'decor': 'Decor',
  'furniture': 'Furniture',
  'kids & toys': 'Kids & Toys',
  'sports & outdoor': 'Sports & Outdoor',
  'misc': 'Miscellaneous',
  'miscellaneous': 'Miscellaneous',
};

function mapCategory(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  return CATEGORY_MAP[key] ?? 'Miscellaneous';
}

// Minimal CSV parser handling quoted fields with commas/newlines.
function parseCsv(text) {
  const out = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"' && field === '') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
        row.push(field);
        if (row.some((v) => v.length > 0)) out.push(row);
        row = []; field = '';
        if (c === '\r') i++;
      } else { field += c; }
    }
  }
  row.push(field);
  if (row.some((v) => v.length > 0)) out.push(row);
  return out;
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const text = readFileSync(INPUT, 'utf8');
const rows = parseCsv(text);
const header = rows[0];
const data = rows.slice(1);

console.log(`Parsed ${data.length} input rows.`);

const COL = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
const C_TOTE_NUM = COL('Tote Number');
const C_TOTE_DESC = COL('Tote Description');
const C_TOTE_LOC = COL('Tote Location');
const C_NAME = COL('Item Name');
const C_CATEGORY = COL('Category');
const C_CONDITION = COL('Condition or Status');
const C_ISBN = COL('ISBN');
const C_NOTES = COL('Notes');
const C_QTY = COL('QTY');

const bookLines = [];
const itemRows = [];

let stats = { books: 0, realLocation: 0, stale: 0, skipped: 0 };

for (const row of data) {
  const toteNum = (row[C_TOTE_NUM] ?? '').trim();
  const toteDesc = (row[C_TOTE_DESC] ?? '').trim();
  const toteLoc = (row[C_TOTE_LOC] ?? '').trim();
  const name = (row[C_NAME] ?? '').trim();
  const categoryRaw = row[C_CATEGORY] ?? '';
  const condition = (row[C_CONDITION] ?? '').trim();
  const isbn = (row[C_ISBN] ?? '').trim();
  const notes = (row[C_NOTES] ?? '').trim();
  const qty = (row[C_QTY] ?? '').trim() || '1';

  if (!name) { stats.skipped++; continue; }

  // ── Books → book-input.txt ─────────────────────────────────
  if (toteNum.toLowerCase() === 'book box #1' && isbn) {
    // Format: Title | Authors | Visible ISBN
    bookLines.push(`${name} | | ${isbn}`);
    stats.books++;
    continue;
  }

  // ── Categorize stale vs real ───────────────────────────────
  const isStale = STALE_CONTAINERS.has(toteNum.toLowerCase());

  // Build the items.csv row
  const noteParts = [];
  if (toteDesc) noteParts.push(`From form: ${toteDesc}`);
  if (toteLoc) noteParts.push(`Loc: ${toteLoc}`);
  if (notes) noteParts.push(notes);
  // For non-GOOD/FAIR/POOR conditions, fold them into notes.
  let mappedCondition = '';
  const upperCond = condition.toUpperCase();
  if (['GOOD', 'FAIR', 'POOR'].includes(upperCond)) mappedCondition = upperCond;
  else if (condition) noteParts.push(`Condition note: ${condition}`);

  const combinedNotes = noteParts.join(' · ');

  if (isStale) {
    itemRows.push({
      name,
      description: '',
      categoryName: mapCategory(categoryRaw),
      condition: mappedCondition || 'GOOD',
      quantity: qty.replace(/[^\d]/g, '') || '1',
      fate: 'UNDECIDED',
      originLocationName: 'Unsorted',
      containerLabel: '',
      notes: `[Stale location from intake form] ${combinedNotes}`.trim(),
    });
    stats.stale++;
  } else {
    itemRows.push({
      name,
      description: '',
      categoryName: mapCategory(categoryRaw),
      condition: mappedCondition || 'GOOD',
      quantity: qty.replace(/[^\d]/g, '') || '1',
      fate: 'UNDECIDED',
      originLocationName: 'In Storage / U-Box',
      containerLabel: toteNum,
      notes: combinedNotes,
    });
    stats.realLocation++;
  }
}

// ── Write book-input.txt ──────────────────────────────────────
writeFileSync(BOOK_OUT, bookLines.join('\n') + '\n');

// ── Write items.csv ───────────────────────────────────────────
const itemHeaders = ['name', 'description', 'categoryName', 'condition', 'quantity', 'fate', 'originLocationName', 'containerLabel', 'notes'];
const csvOut = [
  itemHeaders.join(','),
  ...itemRows.map((r) => itemHeaders.map((h) => csvEscape(r[h])).join(',')),
].join('\n');
writeFileSync(ITEMS_OUT, csvOut + '\n');

console.log('');
console.log(`Books → ${BOOK_OUT}    (${stats.books} rows)`);
console.log(`Items → ${ITEMS_OUT}   (${stats.realLocation} real-location, ${stats.stale} stale, ${stats.skipped} skipped)`);
