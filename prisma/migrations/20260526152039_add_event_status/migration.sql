-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'DEACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");
