-- B-034 · To'lov oqimi invariantlari (CLAUDE.md qoida 12).
--
-- Qo'lda yozilgan: Prisma sxemasi qismiy (partial) indeksni ifodalay olmaydi.

-- 🔒 Bitta buyurtmada bir vaqtda ko'pi bilan BITTA kutilayotgan to'lov.
--    Ikki PENDING to'lov bo'lsa, ikkalasi ham PAID bo'lib, mijoz hisobiga
--    bitta buyurtma uchun ikki marta to'lov tushishi mumkin edi. Parallel
--    "to'lash" bosilganda dastur tekshiruvi buni ushlay olmaydi — baza ushlaydi.
CREATE UNIQUE INDEX "payments_one_pending_per_order"
    ON "payments" ("order_id") WHERE "status" = 'PENDING';

-- 🔒 Provayder tranzaksiyasi bitta to'lovga tegishli. Webhook `provider_ref`
--    bo'yicha qidiradi: dublikat bo'lsa xabar noto'g'ri to'lovga tushardi.
CREATE UNIQUE INDEX "payments_provider_ref_key"
    ON "payments" ("provider_ref") WHERE "provider_ref" IS NOT NULL;
