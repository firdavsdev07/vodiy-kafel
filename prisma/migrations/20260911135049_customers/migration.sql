-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "company_name" TEXT NOT NULL,
    "inn" TEXT,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "manager_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_login_key" ON "customers"("login");

-- CreateIndex
CREATE INDEX "customers_branch_id_is_active_idx" ON "customers"("branch_id", "is_active");

-- CreateIndex
CREATE INDEX "customers_manager_id_idx" ON "customers"("manager_id");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
