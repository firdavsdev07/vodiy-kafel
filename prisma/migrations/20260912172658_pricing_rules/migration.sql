-- CreateEnum
CREATE TYPE "pricing_domain" AS ENUM ('PRODUCT', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "pricing_scope" AS ENUM ('PRODUCT', 'FACTORY', 'ROUTE', 'ALL');

-- CreateEnum
CREATE TYPE "pricing_value_type" AS ENUM ('FIXED', 'PERCENT');

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "domain" "pricing_domain" NOT NULL,
    "scope" "pricing_scope" NOT NULL,
    "product_id" TEXT,
    "factory_id" TEXT,
    "branch_region_tariff_id" TEXT,
    "type" "pricing_value_type" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "created_by_user_id" TEXT,
    "created_by_role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_customer_id_domain_idx" ON "pricing_rules"("customer_id", "domain");

-- CreateIndex
CREATE INDEX "pricing_rules_product_id_idx" ON "pricing_rules"("product_id");

-- CreateIndex
CREATE INDEX "pricing_rules_factory_id_idx" ON "pricing_rules"("factory_id");

-- CreateIndex
CREATE INDEX "pricing_rules_branch_region_tariff_id_idx" ON "pricing_rules"("branch_region_tariff_id");

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_branch_region_tariff_id_fkey" FOREIGN KEY ("branch_region_tariff_id") REFERENCES "branch_region_tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan cheklovlar (CLAUDE.md qoida 12).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) DOMEN × SCOPE × NISHON matritsasi. Butun narx zanjirining ma'nosi shu
--    jadvalga tayanadi, shuning uchun noto'g'ri kombinatsiya bazaga kirmasligi
--    kerak — masalan TRANSPORT qoidasi mahsulotga ishora qilib qolishi.
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_scope_target_check" CHECK (
    ("domain" = 'PRODUCT' AND "scope" = 'PRODUCT'
        AND "product_id" IS NOT NULL
        AND "factory_id" IS NULL AND "branch_region_tariff_id" IS NULL)
 OR ("domain" = 'PRODUCT' AND "scope" = 'FACTORY'
        AND "factory_id" IS NOT NULL
        AND "product_id" IS NULL AND "branch_region_tariff_id" IS NULL)
 OR ("domain" = 'PRODUCT' AND "scope" = 'ALL'
        AND "product_id" IS NULL AND "factory_id" IS NULL
        AND "branch_region_tariff_id" IS NULL)
 OR ("domain" = 'TRANSPORT' AND "scope" = 'ROUTE'
        AND "branch_region_tariff_id" IS NOT NULL
        AND "product_id" IS NULL AND "factory_id" IS NULL)
 OR ("domain" = 'TRANSPORT' AND "scope" = 'ALL'
        AND "product_id" IS NULL AND "factory_id" IS NULL
        AND "branch_region_tariff_id" IS NULL)
);

-- 2) Qiymat ma'noli bo'lishi shart.
--    FIXED   — musbat summa (0 so'mlik "narx" — narx emas)
--    PERCENT — -100 dan katta (aks holda narx manfiy bo'lib ketadi) va
--              0 emas (0% qoida — hech narsa qilmaydigan yozuv, faqat
--              zanjirni chalkashtiradi)
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_value_check" CHECK (
    ("type" = 'FIXED' AND "value" > 0)
 OR ("type" = 'PERCENT' AND "value" > -100 AND "value" <> 0)
);

-- 3) Qoidani faqat bosh admin yoki filial admini qo'yadi (TZ 3.3.1).
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_created_by_role_check"
    CHECK ("created_by_role" IN ('SUPER_ADMIN', 'BRANCH_ADMIN'));

-- 4) Bir mijozga bir darajada BITTA qoida.
--    Aks holda bir mahsulotga ikki xil qoida bo'lib, qaysi biri ishlashi
--    tasodifga qolardi — mijoz bugun 8 000, ertaga 9 000 ko'rardi.
--
--    ⚠ Oddiy UNIQUE yaramaydi: Postgres'da NULL'lar bir-biriga teng emas,
--      shuning uchun scope='ALL' (uchala nishon ham NULL) uchun dublikat
--      o'tib ketardi. Shu sababli har daraja uchun QISMIY (partial) indeks.
CREATE UNIQUE INDEX "pricing_rules_unique_all"
    ON "pricing_rules" ("customer_id", "domain") WHERE "scope" = 'ALL';
CREATE UNIQUE INDEX "pricing_rules_unique_product"
    ON "pricing_rules" ("customer_id", "product_id") WHERE "scope" = 'PRODUCT';
CREATE UNIQUE INDEX "pricing_rules_unique_factory"
    ON "pricing_rules" ("customer_id", "factory_id") WHERE "scope" = 'FACTORY';
CREATE UNIQUE INDEX "pricing_rules_unique_route"
    ON "pricing_rules" ("customer_id", "branch_region_tariff_id") WHERE "scope" = 'ROUTE';
