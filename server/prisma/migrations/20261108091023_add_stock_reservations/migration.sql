-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "stockReserved" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Order_stockReserved_reservationExpiresAt_idx" ON "Order"("stockReserved", "reservationExpiresAt");
