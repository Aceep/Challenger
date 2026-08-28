-- Guide card pinned in each team's librairie salon
-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "discordGuideMessageId" TEXT;

-- CreateTable
CREATE TABLE "PendingReading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "teamId" TEXT,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "type" "BookType" NOT NULL DEFAULT 'ROMAN',
    "questId" TEXT,
    "cellId" TEXT,
    "options" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingReading_userId_idx" ON "PendingReading"("userId");

-- CreateIndex
CREATE INDEX "PendingReading_expiresAt_idx" ON "PendingReading"("expiresAt");

-- AddForeignKey
ALTER TABLE "PendingReading" ADD CONSTRAINT "PendingReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
