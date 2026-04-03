-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "Fate" AS ENUM ('KEEP', 'SELL', 'DONATE', 'TRASH', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "ShapeType" AS ENUM ('BOX', 'CYLINDER', 'SPHERE', 'L_SHAPE', 'PANEL');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('UBOX', 'TOTE_27GAL', 'BOX_SMALL', 'BOX_MEDIUM', 'BOX_LARGE', 'BOX_CUSTOM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('ORIGIN', 'DESTINATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "house" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "floorPlanX" DOUBLE PRECISION,
    "floorPlanY" DOUBLE PRECISION,
    "floorPlanWidth" DOUBLE PRECISION,
    "floorPlanHeight" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "condition" "Condition" NOT NULL DEFAULT 'GOOD',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lengthIn" DOUBLE PRECISION,
    "widthIn" DOUBLE PRECISION,
    "heightIn" DOUBLE PRECISION,
    "weightLbs" DOUBLE PRECISION,
    "shapeType" "ShapeType" NOT NULL DEFAULT 'BOX',
    "fate" "Fate" NOT NULL DEFAULT 'UNDECIDED',
    "originLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT,
    "photoPath" TEXT,
    "qrCodePath" TEXT,
    "isContainer" BOOLEAN NOT NULL DEFAULT false,
    "estimatedSaleValue" DOUBLE PRECISION,
    "llmPriceSuggestion" DOUBLE PRECISION,
    "llmPriceRationale" TEXT,
    "llmPricePlatforms" TEXT[],
    "llmPriceGeneratedAt" TIMESTAMP(3),
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "containerType" "ContainerType" NOT NULL,
    "label" TEXT NOT NULL,
    "internalLengthIn" DOUBLE PRECISION NOT NULL,
    "internalWidthIn" DOUBLE PRECISION NOT NULL,
    "internalHeightIn" DOUBLE PRECISION NOT NULL,
    "maxWeightLbs" DOUBLE PRECISION,
    "qrCodePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_placements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "placedById" TEXT NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "items_categoryId_idx" ON "items"("categoryId");

-- CreateIndex
CREATE INDEX "items_originLocationId_idx" ON "items"("originLocationId");

-- CreateIndex
CREATE INDEX "items_destinationLocationId_idx" ON "items"("destinationLocationId");

-- CreateIndex
CREATE INDEX "items_fate_idx" ON "items"("fate");

-- CreateIndex
CREATE INDEX "items_deletedAt_idx" ON "items"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "containers_itemId_key" ON "containers"("itemId");

-- CreateIndex
CREATE INDEX "item_placements_itemId_idx" ON "item_placements"("itemId");

-- CreateIndex
CREATE INDEX "item_placements_containerId_idx" ON "item_placements"("containerId");

-- CreateIndex
CREATE INDEX "item_placements_placedById_idx" ON "item_placements"("placedById");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_idx" ON "activity_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_originLocationId_fkey" FOREIGN KEY ("originLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_placements" ADD CONSTRAINT "item_placements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_placements" ADD CONSTRAINT "item_placements_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_placements" ADD CONSTRAINT "item_placements_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
