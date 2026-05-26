-- DropIndex
DROP INDEX "events_date_idx";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "date",
DROP COLUMN "time";
