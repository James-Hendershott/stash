#!/usr/bin/env node
/**
 * enrich-books.mjs — turn a pipe-delimited list of books into a CSV with
 * full bibliographic metadata, ready for /api/books/import-csv.
 *
 * Usage:
 *   node scripts/enrich-books.mjs <input.txt> <output.csv>
 *
 * Input format (one book per line, no header):
 *   Title | Authors (semi-colon separated) | Visible ISBN (or blank)
 *
 *   Example:
 *     The Stand | King, Stephen |
 *     Foundation | Asimov, Isaac | 9780553293357
 *     The Hobbit | Tolkien, J.R.R. |
 *
 * Output CSV columns:
 *   title, authors, isbn13, isbn10, publisher, publishedYear, edition,
 *   pageCount, language, binding, coverImageUrl, openLibraryId,
 *   googleBooksId, lookupSource, lookupConfidence
 *
 * What this does NOT do:
 *   - Add originLocation / containerLabel / fate columns. You add those
 *     by hand in your spreadsheet editor before running the import. The
 *     script can't know which box you packed each book into.
 *
 * What this does NOT use:
 *   - No LLMs. No API keys. Just OpenLibrary (primary) and Google Books
 *     (fallback). Both are free and don't require auth for basic search.
 *
 * Throttling: a 200ms delay between rows keeps OpenLibrary happy. A
 * 1,000-row file takes ~3.5 minutes.
 */
import { readFile, writeFile } from 'node:fs/promises';

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/enrich-books.mjs <input.txt> <output.csv>');
  process.exit(1);
}

const RATE_LIMIT_MS = 200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── OpenLibrary ──────────────────────────────────────────────────────
async function searchOpenLibrary({ isbn, title, authors }) {
  const params = new URLSearchParams({ limit: '5' });
  if (isbn) params.set('isbn', isbn.replace(/[-\s]/g, ''));
  if (title) params.set('title', title);
  if (authors?.length) params.set('author', authors[0]);

  try {
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      headers: { 'User-Agent': 'Stash/1.0 (self-hosted inventory app)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data.docs?.[0];
    if (!doc) return null;

    const isbnList = doc.isbn ?? [];
    const isbn13 = isbnList.find((i) => i.length === 13) ?? null;
    const isbn10 = isbnList.find((i) => i.length === 10) ?? null;

    return {
      source: 'openlibrary',
      isbn10,
      isbn13,
      title: doc.title ?? title ?? '',
      authors: doc.author_name ?? authors ?? [],
      publisher: doc.publisher?.[0] ?? null,
      publishedYear: doc.first_publish_year ?? null,
      pageCount: doc.number_of_pages_median ?? null,
      language: doc.language?.[0] ?? null,
      coverImageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
      openLibraryId: doc.key ?? null,
      googleBooksId: null,
    };
  } catch (e) {
    console.error(`  ! OpenLibrary error for "${title}": ${e.message}`);
    return null;
  }
}

// ── Google Books ─────────────────────────────────────────────────────
async function searchGoogleBooks({ isbn, title, authors }) {
  const queryParts = [];
  if (isbn) queryParts.push(`isbn:${isbn.replace(/[-\s]/g, '')}`);
  if (title) queryParts.push(`intitle:"${title}"`);
  if (authors?.length) queryParts.push(`inauthor:"${authors[0]}"`);
  if (!queryParts.length) return null;

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParts.join('+'))}&maxResults=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const vol = data.items?.[0];
    if (!vol?.volumeInfo) return null;

    const ids = vol.volumeInfo.industryIdentifiers ?? [];
    const isbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier ?? null;
    const isbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier ?? null;
    const yearMatch = vol.volumeInfo.publishedDate?.match(/^(\d{4})/);
    const rawCover =
      vol.volumeInfo.imageLinks?.large ??
      vol.volumeInfo.imageLinks?.medium ??
      vol.volumeInfo.imageLinks?.small ??
      vol.volumeInfo.imageLinks?.thumbnail ??
      null;
    const coverImageUrl = rawCover ? rawCover.replace(/^http:/, 'https:') : null;

    return {
      source: 'google-books',
      isbn10,
      isbn13,
      title: vol.volumeInfo.title ?? title ?? '',
      authors: vol.volumeInfo.authors ?? authors ?? [],
      publisher: vol.volumeInfo.publisher ?? null,
      publishedYear: yearMatch ? parseInt(yearMatch[1], 10) : null,
      pageCount: vol.volumeInfo.pageCount ?? null,
      language: vol.volumeInfo.language ?? null,
      coverImageUrl,
      openLibraryId: null,
      googleBooksId: vol.id,
    };
  } catch (e) {
    console.error(`  ! Google Books error for "${title}": ${e.message}`);
    return null;
  }
}

async function lookup({ title, authors, isbn }) {
  if (isbn) {
    const byIsbn = (await searchOpenLibrary({ isbn })) ?? (await searchGoogleBooks({ isbn }));
    if (byIsbn) return byIsbn;
  }
  return (await searchOpenLibrary({ title, authors })) ?? (await searchGoogleBooks({ title, authors }));
}

// ── CSV writing ──────────────────────────────────────────────────────
const HEADERS = [
  'title', 'authors', 'isbn13', 'isbn10', 'publisher', 'publishedYear',
  'edition', 'pageCount', 'language', 'binding', 'coverImageUrl',
  'openLibraryId', 'googleBooksId', 'lookupSource', 'lookupConfidence',
];

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join('; ') : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(values) {
  return HEADERS.map((h) => csvEscape(values[h])).join(',');
}

// ── Input parsing ────────────────────────────────────────────────────
function parseInput(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 2) {
      throw new Error(`Line ${i + 1}: expected "Title | Authors | ISBN", got: ${line}`);
    }
    return {
      title: parts[0],
      authors: parts[1] ? parts[1].split(';').map((a) => a.trim()).filter(Boolean) : [],
      isbn: parts[2] || undefined,
    };
  });
}

// ── Main ─────────────────────────────────────────────────────────────
const input = await readFile(inputPath, 'utf8');
const rows = parseInput(input);

console.log(`📚 Enriching ${rows.length} books...`);
const enriched = [];
let hits = 0;
let misses = 0;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  process.stdout.write(`  [${i + 1}/${rows.length}] ${row.title.slice(0, 50)}... `);

  const result = await lookup(row);
  if (result) {
    enriched.push({
      title: result.title || row.title,
      authors: result.authors?.length ? result.authors : row.authors,
      isbn13: result.isbn13,
      isbn10: result.isbn10,
      publisher: result.publisher,
      publishedYear: result.publishedYear,
      edition: null, // user fills in if relevant
      pageCount: result.pageCount,
      language: result.language,
      binding: 'UNKNOWN', // user fills in or set defaults via CSV editor
      coverImageUrl: result.coverImageUrl,
      openLibraryId: result.openLibraryId,
      googleBooksId: result.googleBooksId,
      lookupSource: result.source,
      lookupConfidence: 0.85,
    });
    console.log(`✓ ${result.source}`);
    hits++;
  } else {
    enriched.push({
      title: row.title,
      authors: row.authors,
      isbn13: null,
      isbn10: row.isbn || null,
      publisher: null,
      publishedYear: null,
      edition: null,
      pageCount: null,
      language: null,
      binding: 'UNKNOWN',
      coverImageUrl: null,
      openLibraryId: null,
      googleBooksId: null,
      lookupSource: 'no-match',
      lookupConfidence: 0,
    });
    console.log(`✗ no match`);
    misses++;
  }

  if (i < rows.length - 1) await sleep(RATE_LIMIT_MS);
}

const csvBody = [HEADERS.join(','), ...enriched.map(toCsvRow)].join('\n');
await writeFile(outputPath, csvBody);

console.log('');
console.log(`✅ Wrote ${outputPath}`);
console.log(`   ${hits} matched, ${misses} unmatched (filter by lookupSource='no-match' to find them).`);
console.log('');
console.log('Next steps:');
console.log('  1. Open the CSV in your spreadsheet editor.');
console.log('  2. Add columns for placement: originLocation, containerLabel, fate, condition, notes.');
console.log('  3. Fill in the rows you care about (defaults are applied where left blank).');
console.log('  4. Save and import via the admin: Books → Import CSV.');
