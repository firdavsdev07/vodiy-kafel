-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "account_transaction_type" AS ENUM ('DEBT', 'PAYMENT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "method" "payment_method" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "provider_ref" TEXT,
    "qr_payload" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_accounts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "total_purchased" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total_paid" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transactions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "account_transaction_type" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "order_id" TEXT,
    "payment_id" TEXT,
    "created_by_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_customer_id_key" ON "customer_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "account_transactions_customer_id_created_at_idx" ON "account_transactions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "account_transactions_order_id_idx" ON "account_transactions"("order_id");

-- CreateIndex
CREATE INDEX "account_transactions_payment_id_idx" ON "account_transactions"("payment_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan cheklovlar (CLAUDE.md qoida 9 va 12).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) To'lov summasi musbat bo'lishi shart. 0 so'mlik "to'lov" — bu to'lov emas,
--    lekin balansga PAYMENT yozuvi bo'lib tushib, hisobotni chalkashtiradi.
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive_check"
    CHECK ("amount" > 0);

-- 2) "To'landi" degan to'lovda VAQTI bo'lishi shart va aksincha.
--    Aks holda "qachon to'langan?" degan savolga javob yo'q — moliyaviy
--    hisobotda eng ko'p kerak bo'ladigan maydon.
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_at_check" CHECK (
    ("status" = 'PAID' AND "paid_at" IS NOT NULL)
    OR ("status" <> 'PAID' AND "paid_at" IS NULL)
);

-- 3) Tranzaksiya turi va summa ISHORASI mos bo'lishi shart.
--    `amount` ishorali saqlanadi, shuning uchun balans = Σ amount.
--    Agar PAYMENT musbat yozilib qolsa — to'lov qarzni KAMAYTIRMAY, oshirib
--    yuboradi. Bu jimgina, lekin eng qimmat xato bo'lardi.
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_sign_check" CHECK (
    ("type" = 'DEBT' AND "amount" > 0)
    OR ("type" = 'PAYMENT' AND "amount" < 0)
    OR ("type" = 'ADJUSTMENT' AND "amount" <> 0)
);

-- 4) Keshlangan yig'indi manfiy bo'lolmaydi.
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_totals_check"
    CHECK ("total_purchased" >= 0 AND "total_paid" >= 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) AUDIT TRAIL QULFI (CLAUDE.md qoida 9)
--
--    "Tranzaksiya o'chirilmaydi — faqat teskari ADJUSTMENT qo'shiladi."
--    Buni faqat dasturga ishonib qo'yish yetarli emas: bitta `UPDATE` yoki
--    `DELETE` butun moliyaviy tarixni yolg'onga aylantiradi va buni keyin
--    aniqlashning iloji bo'lmaydi (o'zgargani ham ko'rinmaydi).
--
--    Shuning uchun jadval trigger bilan qulflanadi. Xato yozuvni tuzatish
--    yo'li BITTA: teskari ishorali ADJUSTMENT qo'shish.
--
--    ℹ️ Dev muhitida jadvalni tozalash kerak bo'lsa — `TRUNCATE` (qator
--       triggerlarini chetlab o'tadi) yoki `prisma migrate reset`.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "account_transactions_immutable"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION
        'account_transactions audit trail: yozuv ozgartirilmaydi va ochirilmaydi. Tuzatish uchun teskari ADJUSTMENT qoshing (CLAUDE.md qoida 9).';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "account_transactions_no_update"
    BEFORE UPDATE ON "account_transactions"
    FOR EACH ROW EXECUTE FUNCTION "account_transactions_immutable"();

CREATE TRIGGER "account_transactions_no_delete"
    BEFORE DELETE ON "account_transactions"
    FOR EACH ROW EXECUTE FUNCTION "account_transactions_immutable"();
