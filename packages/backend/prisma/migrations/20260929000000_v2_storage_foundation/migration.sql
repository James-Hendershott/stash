-- v2 storage foundation (SPEC.md "Data model changes"). Additive only:
-- new tables/columns/enums, four columns made nullable, category name
-- uniqueness moved from global to per-parent. No data is dropped.

-- Trigram matching for fuzzy duplicate detection (items_name_trgm_idx below).
-- Ships with the official postgres image (contrib).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('PLACE', 'AREA', 'SPOT');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('PACKING', 'STORED', 'AWAY');

-- CreateEnum
CREATE TYPE "LabelStatus" AS ENUM ('NONE', 'NOT_PRINTED', 'PRINTED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('STORED', 'IN_USE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_originLocationId_fkey";

-- DropIndex
DROP INDEX "categories_name_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "containers" ADD COLUMN     "bodyColor" TEXT,
ADD COLUMN     "labelPrintedAt" TIMESTAMP(3),
ADD COLUMN     "labelStatus" "LabelStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "lidColor" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "modelId" TEXT,
ADD COLUMN     "number" INTEGER,
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "status" "ContainerStatus" NOT NULL DEFAULT 'PACKING';

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "aiSuggestion" JSONB,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "status" "ItemStatus" NOT NULL DEFAULT 'STORED',
ADD COLUMN     "upc" TEXT,
ALTER COLUMN "originLocationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "kind" "LocationKind",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "shortCode" TEXT,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "house" DROP NOT NULL,
ALTER COLUMN "floor" DROP NOT NULL;

-- CreateTable
CREATE TABLE "container_models" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" TEXT,
    "internalLengthIn" DOUBLE PRECISION,
    "internalWidthIn" DOUBLE PRECISION,
    "internalHeightIn" DOUBLE PRECISION,
    "maxWeightLbs" DOUBLE PRECISION,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "container_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkouts" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "willReturn" BOOLEAN NOT NULL DEFAULT true,
    "purpose" TEXT,
    "fromLocationId" TEXT,
    "returnedAt" TIMESTAMP(3),
    "lastRemindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "container_models_brand_name_key" ON "container_models"("brand", "name");

-- CreateIndex
CREATE INDEX "checkouts_itemId_idx" ON "checkouts"("itemId");

-- CreateIndex
CREATE INDEX "checkouts_userId_idx" ON "checkouts"("userId");

-- CreateIndex
CREATE INDEX "checkouts_returnedAt_idx" ON "checkouts"("returnedAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_parentId_name_key" ON "categories"("parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "containers_number_key" ON "containers"("number");

-- CreateIndex
CREATE INDEX "containers_locationId_idx" ON "containers"("locationId");

-- CreateIndex
CREATE INDEX "containers_status_idx" ON "containers"("status");

-- CreateIndex
CREATE INDEX "items_status_idx" ON "items"("status");

-- CreateIndex
CREATE INDEX "items_locationId_idx" ON "items"("locationId");

-- CreateIndex
CREATE INDEX "items_upc_idx" ON "items"("upc");

-- CreateIndex
CREATE INDEX "items_name_trgm_idx" ON "items" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "locations_shortCode_key" ON "locations"("shortCode");

-- CreateIndex
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_originLocationId_fkey" FOREIGN KEY ("originLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "container_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

