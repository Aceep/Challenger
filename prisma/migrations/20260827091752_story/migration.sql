-- CreateEnum
CREATE TYPE "VoteStatus" AS ENUM ('OPEN', 'AWAITING_TARGET', 'RESOLVED');

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "voteHours" INTEGER NOT NULL DEFAULT 48,
    "startNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryNode" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "requiredQuestId" TEXT,
    "requiredBingoLines" INTEGER,
    "requiredPoints" INTEGER,

    CONSTRAINT "StoryNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryChoice" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetNodeId" TEXT,
    "lockedByQuestId" TEXT,
    "effects" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoryChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStoryState" (
    "teamId" TEXT NOT NULL,
    "currentNodeId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamStoryState_pkey" PRIMARY KEY ("teamId")
);

-- CreateTable
CREATE TABLE "StoryVisit" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "choiceLabel" TEXT,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "VoteStatus" NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3) NOT NULL,
    "resultChoiceId" TEXT,
    "targetTeamId" TEXT,
    "discordMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteBallot" (
    "voteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteBallot_pkey" PRIMARY KEY ("voteId","userId")
);

-- CreateTable
CREATE TABLE "Alliance" (
    "id" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alliance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Story_challengeId_key" ON "Story"("challengeId");

-- CreateIndex
CREATE INDEX "StoryNode_storyId_sortOrder_idx" ON "StoryNode"("storyId", "sortOrder");

-- CreateIndex
CREATE INDEX "StoryChoice_nodeId_sortOrder_idx" ON "StoryChoice"("nodeId", "sortOrder");

-- CreateIndex
CREATE INDEX "StoryVisit_teamId_arrivedAt_idx" ON "StoryVisit"("teamId", "arrivedAt");

-- CreateIndex
CREATE INDEX "Vote_teamId_status_idx" ON "Vote"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_teamAId_teamBId_key" ON "Alliance"("teamAId", "teamBId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryNode" ADD CONSTRAINT "StoryNode_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryChoice" ADD CONSTRAINT "StoryChoice_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "StoryNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryChoice" ADD CONSTRAINT "StoryChoice_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "StoryNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStoryState" ADD CONSTRAINT "TeamStoryState_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStoryState" ADD CONSTRAINT "TeamStoryState_currentNodeId_fkey" FOREIGN KEY ("currentNodeId") REFERENCES "StoryNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryVisit" ADD CONSTRAINT "StoryVisit_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryVisit" ADD CONSTRAINT "StoryVisit_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "StoryNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "StoryNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_resultChoiceId_fkey" FOREIGN KEY ("resultChoiceId") REFERENCES "StoryChoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "StoryChoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alliance" ADD CONSTRAINT "Alliance_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alliance" ADD CONSTRAINT "Alliance_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
