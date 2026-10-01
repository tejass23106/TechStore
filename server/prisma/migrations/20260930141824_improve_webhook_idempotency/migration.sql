-- AlterTable
ALTER TABLE "RazorpayWebhookEvent" ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RazorpayWebhookEvent_processed_idx" ON "RazorpayWebhookEvent"("processed");
