-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'RESOLVED');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "discordAdminRoleId" TEXT,
ADD COLUMN     "discordFaqChannelId" TEXT,
ADD COLUMN     "discordFaqTags" JSONB,
ADD COLUMN     "faqSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "discordThreadId" TEXT,
    "lastDiscordMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionMessage" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT,
    "discordUserId" TEXT,
    "discordUserName" TEXT,
    "discordMessageId" TEXT,
    "body" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_discordThreadId_key" ON "Question"("discordThreadId");

-- CreateIndex
CREATE INDEX "Question_challengeId_status_idx" ON "Question"("challengeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionMessage_discordMessageId_key" ON "QuestionMessage"("discordMessageId");

-- CreateIndex
CREATE INDEX "QuestionMessage_questionId_createdAt_idx" ON "QuestionMessage"("questionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionMessage" ADD CONSTRAINT "QuestionMessage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionMessage" ADD CONSTRAINT "QuestionMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

