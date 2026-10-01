-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "refundedAmount" SET DEFAULT 0,
ALTER COLUMN "refundedAmount" SET DATA TYPE DECIMAL(12,2);
