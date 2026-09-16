-- CreateEnum
CREATE TYPE "branch_type" AS ENUM ('RETAIL', 'CENTRAL');

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "type" "branch_type" NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "working_hours" TEXT NOT NULL,
    "phones" TEXT[],
    "building_image_url" TEXT,
    "telegram_url" TEXT,
    "instagram_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "website_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branches_type_is_active_idx" ON "branches"("type", "is_active");

-- CreateIndex
CREATE INDEX "branches_is_active_sort_order_idx" ON "branches"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "partners_is_active_sort_order_idx" ON "partners"("is_active", "sort_order");
