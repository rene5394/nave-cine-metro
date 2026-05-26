-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'DEACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "categories"("status");
