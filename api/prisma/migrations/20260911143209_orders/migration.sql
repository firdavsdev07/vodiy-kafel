-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('NEW', 'SEARCHING_TRANSPORT', 'LOADING', 'DELIVERING', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "order_source" AS ENUM ('WEBSITE', 'TELEGRAM', 'PHONE', 'ADMIN');

-- CreateEnum
CREATE TYPE "ordering_type" AS ENUM ('CUSTOMER', 'BRANCH', 'AGENT');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "ordering_type" "ordering_type" NOT NULL DEFAULT 'CUSTOMER',
    "customer_id" TEXT,
    "guest_name" TEXT,
    "guest_phone" TEXT,
    "ordering_branch_id" TEXT,
    "source" "order_source" NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'NEW',
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "branch_id" TEXT,
    "manager_id" TEXT,
    "items_total" DECIMAL(14,2) NOT NULL,
    "delivery_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(14,2) NOT NULL,
    "region_id" TEXT,
    "transport_type_id" TEXT,
    "transport_count" INTEGER,
    "exact_lat" DOUBLE PRECISION,
    "exact_lng" DOUBLE PRECISION,
    "total_sqm" DECIMAL(12,4) NOT NULL,
    "total_weight_kg" DECIMAL(12,3) NOT NULL,
    "total_pallets" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "pallets" INTEGER NOT NULL,
    "sqm" DECIMAL(12,4) NOT NULL,
    "weight_kg" DECIMAL(12,3) NOT NULL,
    "price_per_sqm_snapshot" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "order_status" NOT NULL,
    "changed_by_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_branch_id_status_idx" ON "orders"("branch_id", "status");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_ordering_type_ordering_branch_id_idx" ON "orders"("ordering_type", "ordering_branch_id");

-- CreateIndex
CREATE INDEX "orders_manager_id_idx" ON "orders"("manager_id");

-- CreateIndex
CREATE INDEX "orders_is_urgent_status_idx" ON "orders"("is_urgent", "status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordering_branch_id_fkey" FOREIGN KEY ("ordering_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan cheklovlar (CLAUDE.md qoida 12).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Summa yaxlitligi. `grandTotal` alohida ustun bo'lgani uchun u
--    `itemsTotal + deliveryTotal` dan chetlab ketishi mumkin edi — masalan
--    yo'l kira keyin qo'shilib, grandTotal yangilanmay qolsa. Bunday
--    buyurtma hisobotda ham, balansda ham jimgina xato beradi.
ALTER TABLE "orders" ADD CONSTRAINT "orders_grand_total_check"
    CHECK ("grand_total" = "items_total" + "delivery_total");

ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_not_negative_check"
    CHECK ("items_total" >= 0 AND "delivery_total" >= 0 AND "grand_total" >= 0);

ALTER TABLE "orders" ADD CONSTRAINT "orders_quantities_positive_check"
    CHECK ("total_pallets" > 0 AND "total_sqm" > 0 AND "total_weight_kg" > 0);

-- 2) Xaridor kim ekani ANIQ bo'lishi shart. Aks holda "egasiz" buyurtma
--    paydo bo'ladi: kimga yozilganini hech kim bilmaydi.
--      CUSTOMER / AGENT → mijoz hisobi bor, filial buyurtma bermayapti
--      BRANCH           → filial buyurtma beryapti, mijoz hisobi yo'q
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordering_type_check" CHECK (
    ("ordering_type" IN ('CUSTOMER', 'AGENT')
        AND "ordering_branch_id" IS NULL)
    OR ("ordering_type" = 'BRANCH'
        AND "ordering_branch_id" IS NOT NULL
        AND "customer_id" IS NULL)
);

-- 3) Har bir buyurtmada xaridorni aniqlaydigan BIRORTA ma'lumot bo'lishi
--    kerak: mijoz hisobi, mehmon telefoni (menejer kiritgan) yoki filial.
ALTER TABLE "orders" ADD CONSTRAINT "orders_has_buyer_check" CHECK (
    "customer_id" IS NOT NULL
    OR "guest_phone" IS NOT NULL
    OR "ordering_branch_id" IS NOT NULL
);

-- 4) Yetkazib berish to'liq bo'lsin: transport tanlangan bo'lsa, viloyat
--    ham, nechta mashina ekani ham bo'lishi shart (narx shulardan chiqadi).
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_complete_check" CHECK (
    "transport_type_id" IS NULL
    OR ("region_id" IS NOT NULL AND "transport_count" IS NOT NULL
        AND "transport_count" > 0)
);

-- 5) Buyurtma qatorlari
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_positive_check"
    CHECK ("pallets" > 0 AND "sqm" > 0 AND "weight_kg" > 0
       AND "price_per_sqm_snapshot" > 0 AND "line_total" >= 0);
