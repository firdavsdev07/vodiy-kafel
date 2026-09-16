-- CreateEnum
CREATE TYPE "product_surface" AS ENUM ('POL', 'DEVOR');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('IMAGE', 'IMAGE_360', 'VIDEO_360');

-- CreateTable
CREATE TABLE "factories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "description" TEXT,
    "website_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sizes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "width_cm" INTEGER NOT NULL,
    "height_cm" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "factory_id" TEXT NOT NULL,
    "size_id" TEXT NOT NULL,
    "surface" "product_surface" NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "sqm_per_pallet" DECIMAL(10,4) NOT NULL,
    "weight_per_pallet" DECIMAL(10,3) NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_products" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price_per_sqm" DECIMAL(14,2) NOT NULL,
    "stock_pallets" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "media_type" NOT NULL DEFAULT 'IMAGE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_similars" (
    "product_id" TEXT NOT NULL,
    "similar_product_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_similars_pkey" PRIMARY KEY ("product_id","similar_product_id")
);

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "title" TEXT,
    "product_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "factories_slug_key" ON "factories"("slug");

-- CreateIndex
CREATE INDEX "factories_is_active_sort_order_idx" ON "factories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_sizes_label_key" ON "product_sizes"("label");

-- CreateIndex
CREATE INDEX "product_sizes_sort_order_idx" ON "product_sizes"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_factory_id_is_active_idx" ON "products"("factory_id", "is_active");

-- CreateIndex
CREATE INDEX "products_size_id_is_active_idx" ON "products"("size_id", "is_active");

-- CreateIndex
CREATE INDEX "products_surface_is_active_idx" ON "products"("surface", "is_active");

-- CreateIndex
CREATE INDEX "branch_products_branch_id_is_active_idx" ON "branch_products"("branch_id", "is_active");

-- CreateIndex
CREATE INDEX "branch_products_product_id_idx" ON "branch_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_products_branch_id_product_id_key" ON "branch_products"("branch_id", "product_id");

-- CreateIndex
CREATE INDEX "product_media_product_id_sort_order_idx" ON "product_media"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "product_similars_similar_product_id_idx" ON "product_similars"("similar_product_id");

-- CreateIndex
CREATE INDEX "gallery_items_is_active_sort_order_idx" ON "gallery_items"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "gallery_items_product_id_idx" ON "gallery_items"("product_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "product_sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_similars" ADD CONSTRAINT "product_similars_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_similars" ADD CONSTRAINT "product_similars_similar_product_id_fkey" FOREIGN KEY ("similar_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan cheklovlar (CLAUDE.md qoida 12).
-- ─────────────────────────────────────────────────────────────────────────────

-- Mahsulot o'ziga o'zi "o'xshash" bo'lolmaydi — aks holda katalogda
-- "shunga o'xshash" ro'yxatida mahsulotning o'zi chiqib qoladi.
ALTER TABLE "product_similars" ADD CONSTRAINT "product_similars_not_self_check"
    CHECK ("product_id" <> "similar_product_id");

-- Narx va zaxira manfiy bo'lolmaydi. Narx 0 bo'lishi ham mumkin emas:
-- 0 narx "bepul" degani emas, "narx kiritilmagan" degani — bunday holat
-- kalkulyatorda jimgina 0 so'mlik buyurtma yasab qo'yadi.
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_price_positive_check"
    CHECK ("price_per_sqm" > 0);
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_stock_not_negative_check"
    CHECK ("stock_pallets" >= 0);
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_threshold_not_negative_check"
    CHECK ("low_stock_threshold" IS NULL OR "low_stock_threshold" >= 0);

-- Paddon xarakteristikalari musbat bo'lishi shart: ular narx va transport
-- hisobiga ko'paytma sifatida kiradi (0 yoki manfiy = buzuq hisob).
ALTER TABLE "products" ADD CONSTRAINT "products_sqm_per_pallet_positive_check"
    CHECK ("sqm_per_pallet" > 0);
ALTER TABLE "products" ADD CONSTRAINT "products_weight_per_pallet_positive_check"
    CHECK ("weight_per_pallet" > 0);
