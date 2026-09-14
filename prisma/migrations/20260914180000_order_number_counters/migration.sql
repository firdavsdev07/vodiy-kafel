-- CreateTable
CREATE TABLE "order_number_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL,

    CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("year")
);

-- Qo'lda (CLAUDE.md qoida 12): hisoblagich faqat musbat, yil real oraliqda.
ALTER TABLE "order_number_counters" ADD CONSTRAINT "order_number_counters_values_check"
    CHECK ("last_value" > 0 AND "year" BETWEEN 2000 AND 9999);

-- Qo'lda: hisoblagichni MAVJUD buyurtmalardan boshlash. Busiz birinchi yangi
-- buyurtma bor raqamni (masalan VK-2026-000001) qayta olib, unique xato
-- berardi — va tranzaksiya qaytgani uchun hisoblagich hech qachon oshmasdi.
INSERT INTO "order_number_counters" ("year", "last_value")
SELECT substring("order_number" FROM 4 FOR 4)::int,
       max(substring("order_number" FROM 9)::int)
FROM "orders"
WHERE "order_number" ~ '^VK-[0-9]{4}-[0-9]+$'
GROUP BY 1;
