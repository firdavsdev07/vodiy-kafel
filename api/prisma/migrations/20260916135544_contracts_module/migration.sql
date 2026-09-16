-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('DRAFT', 'SENT', 'SIGNED');

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'CONTRACT_READY';

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "inn" TEXT NOT NULL,
    "company_data_json" JSONB NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_customer_id_created_at_idx" ON "contracts"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "contracts_order_id_idx" ON "contracts"("order_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
