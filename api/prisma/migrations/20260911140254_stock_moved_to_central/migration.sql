/*
  Warnings:

  - You are about to drop the column `low_stock_threshold` on the `branch_products` table. All the data in the column will be lost.
  - You are about to drop the column `stock_pallets` on the `branch_products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "branch_products" DROP COLUMN "low_stock_threshold",
DROP COLUMN "stock_pallets";

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "productStockId" TEXT;

-- CreateTable
CREATE TABLE "product_stocks" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "stock_pallets" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_stocks_product_id_key" ON "product_stocks"("product_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_productStockId_fkey" FOREIGN KEY ("productStockId") REFERENCES "product_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zaxira cheklovlari `branch_products` dan `product_stocks` ga ko'chdi
-- (CLAUDE.md qoida 12).
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_stock_not_negative_check"
    CHECK ("stock_pallets" >= 0);
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_threshold_not_negative_check"
    CHECK ("low_stock_threshold" IS NULL OR "low_stock_threshold" >= 0);
