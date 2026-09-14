-- Tuzatish: oldingi migratsiya (stock_moved_to_central) `branches` jadvaliga
-- keraksiz `productStockId` ustunini qo'shib yuborgan edi.
--
-- Sabab: sxemaga `stock ProductStock?` qatori xato joyga — Product o'rniga
-- Branch modeliga tushgan (ikkala modelda ham `branchProducts` maydoni bor).
-- Sxema darhol tuzatilgan, lekin generatsiya qilingan SQL eski holatni
-- o'z ichiga olgan.
--
-- ⚠ Zaxira filialga BOG'LANMAYDI (TZ 3.7.1) — bu ustunning bo'lishi
--   aynan shu qoidaga zid edi.
ALTER TABLE "branches" DROP CONSTRAINT IF EXISTS "branches_productStockId_fkey";
ALTER TABLE "branches" DROP COLUMN IF EXISTS "productStockId";
