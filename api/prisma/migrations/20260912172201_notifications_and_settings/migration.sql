-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'PAYMENT_RECEIVED', 'NEW_PRODUCT', 'COMMENT_REPLY');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "user_id" TEXT,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "notifications_customer_id_is_read_created_at_idx" ON "notifications"("customer_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan cheklovlar (CLAUDE.md qoida 12).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Bildirishnomaning qabul qiluvchisi ANIQ BITTA bo'lishi shart.
--    Ikkalasi ham bo'sh bo'lsa — hech kim ko'rmaydigan yozuv.
--    Ikkalasi ham to'la bo'lsa — hisoblagich ikki joyda ikki marta sanaydi.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_one_recipient_check" CHECK (
    ("customer_id" IS NOT NULL AND "user_id" IS NULL)
    OR ("customer_id" IS NULL AND "user_id" IS NOT NULL)
);

-- 2) "O'qilgan" bo'lsa — qachon o'qilgani ham bo'lishi shart va aksincha.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_read_at_check" CHECK (
    ("is_read" = true AND "read_at" IS NOT NULL)
    OR ("is_read" = false AND "read_at" IS NULL)
);
