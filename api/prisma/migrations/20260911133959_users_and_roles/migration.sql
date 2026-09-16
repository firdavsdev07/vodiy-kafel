-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER', 'MODERATOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "branch_id" TEXT,
    "telegram_username" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_branch_id_role_idx" ON "users"("branch_id", "role");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Qo'lda qo'shilgan (Prisma sxemasi bunday qoidani ifodalay olmaydi).
--
-- Filial izolyatsiyasining eng asosiy invarianti (CLAUDE.md qoida 5):
--   SUPER_ADMIN  → branch_id BO'SH bo'lishi shart (u hamma filialni ko'radi)
--   qolgan rollar → branch_id BO'LISHI shart (aks holda "filialsiz admin"
--                   paydo bo'ladi va scope filtri hech narsani cheklamaydi)
--
-- Buni faqat dasturga ishonib qo'yib bo'lmaydi: seed, migratsiya yoki
-- qo'lda SQL orqali ham buzilmasligi kerak.
--
-- ⚠ MODERATOR → CENTRAL filial qoidasi bu yerda YO'Q: u boshqa jadvalga
--   qarashni talab qiladi (branches.type), CHECK esa buni qila olmaydi.
--   U dastur darajasida tekshiriladi (B-057).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "users" ADD CONSTRAINT "users_branch_scope_check" CHECK (
    ("role" = 'SUPER_ADMIN' AND "branch_id" IS NULL)
    OR ("role" <> 'SUPER_ADMIN' AND "branch_id" IS NOT NULL)
);
