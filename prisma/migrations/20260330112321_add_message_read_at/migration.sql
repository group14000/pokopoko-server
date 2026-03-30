-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_receiverId_conversationId_readAt_idx" ON "Message"("receiverId", "conversationId", "readAt");
