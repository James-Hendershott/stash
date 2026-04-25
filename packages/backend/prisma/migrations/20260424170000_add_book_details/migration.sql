-- CreateEnum
CREATE TYPE "BookBinding" AS ENUM ('HARDBACK', 'PAPERBACK', 'EBOOK', 'AUDIOBOOK', 'BOXED_SET', 'UNKNOWN');

-- CreateTable
CREATE TABLE "book_details" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "isbn10" TEXT,
    "isbn13" TEXT,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "publisher" TEXT,
    "publishedYear" INTEGER,
    "edition" TEXT,
    "pageCount" INTEGER,
    "language" TEXT,
    "binding" "BookBinding" NOT NULL DEFAULT 'UNKNOWN',
    "coverImageUrl" TEXT,
    "openLibraryId" TEXT,
    "googleBooksId" TEXT,
    "lookupSource" TEXT,
    "lookupConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_details_itemId_key" ON "book_details"("itemId");

-- CreateIndex
CREATE INDEX "book_details_isbn13_idx" ON "book_details"("isbn13");

-- CreateIndex
CREATE INDEX "book_details_isbn10_idx" ON "book_details"("isbn10");

-- AddForeignKey
ALTER TABLE "book_details" ADD CONSTRAINT "book_details_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
