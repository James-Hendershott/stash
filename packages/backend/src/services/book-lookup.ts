/**
 * Book metadata lookup — OpenLibrary first, Google Books fallback.
 *
 * Both APIs are free, neither requires a key. We normalize their
 * responses into a single `BookLookupResult` shape so callers don't
 * care which one answered.
 *
 * No LLM in this file — vision-based cover reading was removed in
 * v1.2.1 in favour of an offline enrichment workflow (see
 * scripts/enrich-books.mjs and BUILD_LOG Chapter 21). The same lookup
 * helpers are imported by both the backend route and the standalone
 * script.
 */
import type { BookLookupResult } from '@stash/shared';

// ── OpenLibrary ──────────────────────────────────────────────────────
// https://openlibrary.org/developers/api — no key required.

interface OpenLibrarySearchDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  publisher?: string[];
  cover_i?: number;
  language?: string[];
  number_of_pages_median?: number;
}

async function searchOpenLibrary(args: {
  isbn?: string;
  title?: string;
  authors?: string[];
}): Promise<BookLookupResult | null> {
  const params = new URLSearchParams({ limit: '5' });
  if (args.isbn) params.set('isbn', args.isbn.replace(/[-\s]/g, ''));
  if (args.title) params.set('title', args.title);
  if (args.authors?.length) params.set('author', args.authors[0]);

  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { 'User-Agent': 'Stash/1.0 (self-hosted inventory app)' },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { docs?: OpenLibrarySearchDoc[] };
  const doc = data.docs?.[0];
  if (!doc) return null;

  const isbnList = doc.isbn ?? [];
  const isbn13 = isbnList.find((i) => i.length === 13) ?? null;
  const isbn10 = isbnList.find((i) => i.length === 10) ?? null;

  return {
    source: 'openlibrary',
    isbn10,
    isbn13,
    title: doc.title ?? args.title ?? '',
    authors: doc.author_name ?? args.authors ?? [],
    publisher: doc.publisher?.[0] ?? null,
    publishedYear: doc.first_publish_year ?? null,
    pageCount: doc.number_of_pages_median ?? null,
    language: doc.language?.[0] ?? null,
    coverImageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    openLibraryId: doc.key ?? null,
    googleBooksId: null,
  };
}

// ── Google Books ─────────────────────────────────────────────────────
// https://developers.google.com/books/docs/v1/using — no key required for
// basic public-volume lookups, but quota applies (1000 req/day unauth).

interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string; small?: string; medium?: string; large?: string };
  };
}

async function searchGoogleBooks(args: {
  isbn?: string;
  title?: string;
  authors?: string[];
}): Promise<BookLookupResult | null> {
  const queryParts: string[] = [];
  if (args.isbn) queryParts.push(`isbn:${args.isbn.replace(/[-\s]/g, '')}`);
  if (args.title) queryParts.push(`intitle:"${args.title}"`);
  if (args.authors?.length) queryParts.push(`inauthor:"${args.authors[0]}"`);
  if (!queryParts.length) return null;

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParts.join('+'))}&maxResults=5`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { items?: GoogleBooksVolume[] };
  const vol = data.items?.[0];
  if (!vol?.volumeInfo) return null;

  const ids = vol.volumeInfo.industryIdentifiers ?? [];
  const isbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier ?? null;
  const isbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier ?? null;

  const yearMatch = vol.volumeInfo.publishedDate?.match(/^(\d{4})/);

  // Google Books thumbnails come back as http; force https so the admin
  // dashboard (loaded via SSL) doesn't get mixed-content blocked.
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
    title: vol.volumeInfo.title ?? args.title ?? '',
    authors: vol.volumeInfo.authors ?? args.authors ?? [],
    publisher: vol.volumeInfo.publisher ?? null,
    publishedYear: yearMatch ? parseInt(yearMatch[1], 10) : null,
    pageCount: vol.volumeInfo.pageCount ?? null,
    language: vol.volumeInfo.language ?? null,
    coverImageUrl,
    openLibraryId: null,
    googleBooksId: vol.id,
  };
}

// ── Public lookup helpers ────────────────────────────────────────────

export async function lookupByISBN(isbn: string): Promise<BookLookupResult | null> {
  return (await searchOpenLibrary({ isbn })) ?? (await searchGoogleBooks({ isbn }));
}

export async function lookupByTitleAuthor(args: {
  title: string;
  authors: string[];
}): Promise<BookLookupResult | null> {
  return (await searchOpenLibrary(args)) ?? (await searchGoogleBooks(args));
}
