import { z } from 'zod';
import { BookBinding } from '@stash/shared';

export const lookupSchema = z
  .object({
    isbn: z.string().min(10).max(20).optional(),
    title: z.string().min(1).optional(),
    author: z.string().min(1).optional(),
  })
  .refine((v) => v.isbn || (v.title && v.author), {
    message: 'Provide either isbn or both title and author',
  });

const isbnRegex = /^[0-9Xx-]{10,17}$/;

export const updateBookDetailsSchema = z.object({
  title: z.string().min(1).optional(),
  authors: z.array(z.string().min(1)).optional(),
  isbn10: z.string().regex(isbnRegex).nullable().optional(),
  isbn13: z.string().regex(isbnRegex).nullable().optional(),
  publisher: z.string().nullable().optional(),
  publishedYear: z.number().int().min(1000).max(3000).nullable().optional(),
  edition: z.string().nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  language: z.string().max(10).nullable().optional(),
  binding: z.nativeEnum(BookBinding).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
});
