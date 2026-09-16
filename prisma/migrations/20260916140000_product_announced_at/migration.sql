-- B-040 · Yangi mahsulot bildirishnomasi — bir martalik e'lon belgisi.
ALTER TABLE "products" ADD COLUMN "announced_at" TIMESTAMP(3);

-- Qo'lda: MAVJUD mahsulotlar "e'lon qilingan" deb belgilanadi. Aks holda
-- birinchi marta tahrirlab yoqilganda eski katalog butunligicha mijozlarga
-- "yangi" bo'lib ketardi.
UPDATE "products" SET "announced_at" = "created_at";
