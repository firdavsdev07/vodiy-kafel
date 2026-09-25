-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_requested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dispatch_branch_id" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_dispatch_branch_id_fkey" FOREIGN KEY ("dispatch_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- T-004: eski buyurtmalar — yo'nalishi bor bo'lsa, yetkazib berish so'ralgan.
UPDATE "orders" SET "delivery_requested" = true WHERE "region_id" IS NOT NULL;

-- 🔒 Yo'nalish belgilangan buyurtma — albatta yetkazib berish (CLAUDE.md qoida 12).
--    Aks holda "olib ketish, lekin yo'l kira bor" degan holat paydo bo'lardi.
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_region_requires_delivery_requested"
  CHECK ("region_id" IS NULL OR "delivery_requested");
