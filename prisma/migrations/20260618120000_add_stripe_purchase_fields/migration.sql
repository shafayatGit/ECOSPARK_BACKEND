-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "idea_purchases" ADD COLUMN "stripeEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "idea_purchases_stripeEventId_key" ON "idea_purchases"("stripeEventId");

-- CreateIndex
CREATE INDEX "idea_purchases_paymentStatus_idx" ON "idea_purchases"("paymentStatus");
