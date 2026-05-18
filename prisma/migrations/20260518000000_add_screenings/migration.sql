-- CreateTable
CREATE TABLE "screenings" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "availableTickets" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screenings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "screenings_eventId_idx" ON "screenings"("eventId");

-- CreateIndex
CREATE INDEX "screenings_date_idx" ON "screenings"("date");

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one screening per existing event, preserving current date/time/availableTickets
INSERT INTO "screenings" ("id", "eventId", "date", "time", "availableTickets", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "date", "time", "availableTickets", NOW(), NOW()
FROM "events";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "availableTickets";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "screeningId" UUID;

-- DropIndex
DROP INDEX "order_items_orderId_eventId_key";

-- CreateIndex
CREATE INDEX "order_items_screeningId_idx" ON "order_items"("screeningId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_eventId_screeningId_key" ON "order_items"("orderId", "eventId", "screeningId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "screenings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
