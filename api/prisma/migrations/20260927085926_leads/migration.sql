-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE', 'SPAM');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "branch_id" TEXT,
    "status" "lead_status" NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "handled_by_user_id" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");

-- CreateIndex
CREATE INDEX "leads_branch_id_status_created_at_idx" ON "leads"("branch_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "leads_phone_created_at_idx" ON "leads"("phone", "created_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_handled_by_user_id_fkey" FOREIGN KEY ("handled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- T-013: ochiq endpoint ortidagi jadval — hajm chegarasi DTO'dan tashqari
-- bazada ham (CLAUDE.md qoida 12). DTO chegarasi unutilsa yoki boshqa yo'l
-- (qo'lda SQL, kelajakdagi import) paydo bo'lsa ham jadval "shishmaydi".
ALTER TABLE "leads" ADD CONSTRAINT "leads_name_length_check"
    CHECK (char_length("name") BETWEEN 1 AND 100);
ALTER TABLE "leads" ADD CONSTRAINT "leads_phone_length_check"
    CHECK (char_length("phone") BETWEEN 9 AND 20);
ALTER TABLE "leads" ADD CONSTRAINT "leads_message_length_check"
    CHECK (char_length("message") BETWEEN 1 AND 2000);
ALTER TABLE "leads" ADD CONSTRAINT "leads_note_length_check"
    CHECK ("note" IS NULL OR char_length("note") <= 1000);
