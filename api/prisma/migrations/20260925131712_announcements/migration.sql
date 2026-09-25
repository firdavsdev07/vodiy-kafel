-- CreateEnum
CREATE TYPE "announcement_audience" AS ENUM ('ALL', 'SELECTED');

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "audience" "announcement_audience" NOT NULL,
    "recipient_count" INTEGER NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_created_by_user_id_created_at_idx" ON "announcements"("created_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
