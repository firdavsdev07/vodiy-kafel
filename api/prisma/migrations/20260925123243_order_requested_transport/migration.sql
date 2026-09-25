-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "requested_transport_type_id" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_requested_transport_type_id_fkey" FOREIGN KEY ("requested_transport_type_id") REFERENCES "transport_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
