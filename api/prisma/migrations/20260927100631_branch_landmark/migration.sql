-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "landmark" TEXT;

-- T-015: bo'sh satr "oriyentir yo'q" EMAS — u `NULL`. Aks holda sayt bo'sh
-- qator chizadi. DTO bo'sh satrni `null` ga aylantiradi; bu — qo'lda SQL
-- yoki import uchun qulf (CLAUDE.md qoida 12).
ALTER TABLE "branches" ADD CONSTRAINT "branches_landmark_check"
    CHECK ("landmark" IS NULL OR char_length(btrim("landmark")) BETWEEN 1 AND 200);
