-- 2026-09-18 (mijoz talabi): optom mijoz ham telefon + parol bilan
-- kiradi (POST /auth/login, xodim bilan bitta umumiy login sahifasi).
-- Shuning uchun `customers.phone` endi `users.phone` kabi NOYOB bo'lishi
-- shart -- ikkalasi ham bir xil "kim bu telefon egasi" jadvaliga
-- (amalda ikki jadval, lekin dastur darajasida bitta manzil sifatida
-- ko'riladi) tegishli.
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
