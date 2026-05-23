-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'REDEEMED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REDEEMED';

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_token_key" ON "tickets"("token");

-- CreateIndex
CREATE INDEX "tickets_orderItemId_idx" ON "tickets"("orderItemId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
