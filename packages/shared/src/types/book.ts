export enum BookBinding {
  HARDBACK = 'HARDBACK',
  PAPERBACK = 'PAPERBACK',
  EBOOK = 'EBOOK',
  AUDIOBOOK = 'AUDIOBOOK',
  BOXED_SET = 'BOXED_SET',
  UNKNOWN = 'UNKNOWN',
}

export interface BookDetails {
  id: string;
  itemId: string;
  isbn10: string | null;
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  edition: string | null;
  pageCount: number | null;
  language: string | null;
  binding: BookBinding;
  coverImageUrl: string | null;
  openLibraryId: string | null;
  googleBooksId: string | null;
  lookupSource: string | null;
  lookupConfidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// What lookup APIs return. We normalize OpenLibrary and Google Books into
// the same shape so the route handler doesn't care which one answered.
export interface BookLookupResult {
  source: 'openlibrary' | 'google-books';
  isbn10: string | null;
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  language: string | null;
  coverImageUrl: string | null;
  openLibraryId: string | null;
  googleBooksId: string | null;
}
