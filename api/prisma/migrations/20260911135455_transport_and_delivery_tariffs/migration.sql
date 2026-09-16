-- CreateTable
CREATE TABLE "transport_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity_pallets" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_region_tariffs" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "transport_type_id" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_region_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transport_types_name_key" ON "transport_types"("name");

-- CreateIndex
CREATE INDEX "transport_types_is_active_sort_order_idx" ON "transport_types"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE INDEX "regions_is_active_sort_order_idx" ON "regions"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "branch_region_tariffs_branch_id_is_active_idx" ON "branch_region_tariffs"("branch_id", "is_active");

-- CreateIndex
CREATE INDEX "branch_region_tariffs_region_id_idx" ON "branch_region_tariffs"("region_id");

-- CreateIndex
CREATE INDEX "branch_region_tariffs_transport_type_id_idx" ON "branch_region_tariffs"("transport_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_region_tariffs_branch_id_region_id_transport_type_id_key" ON "branch_region_tariffs"("branch_id", "region_id", "transport_type_id");

-- AddForeignKey
ALTER TABLE "branch_region_tariffs" ADD CONSTRAINT "branch_region_tariffs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_region_tariffs" ADD CONSTRAINT "branch_region_tariffs_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_region_tariffs" ADD CONSTRAINT "branch_region_tariffs_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Qo'lda qo'shilgan cheklovlar (CLAUDE.md qoida 12).
-- Yo'l kira 0 yoki manfiy bo'lolmaydi: 0 = "tarif kiritilmagan", bu
-- kalkulyatorda jimgina bepul yetkazib berish bo'lib chiqadi.
ALTER TABLE "branch_region_tariffs" ADD CONSTRAINT "branch_region_tariffs_price_positive_check"
    CHECK ("price" > 0);

-- Sig'imi 0 bo'lgan transport "nechta mashina kerak" hisobida
-- nolga bo'lishga olib keladi.
ALTER TABLE "transport_types" ADD CONSTRAINT "transport_types_capacity_positive_check"
    CHECK ("capacity_pallets" > 0);
