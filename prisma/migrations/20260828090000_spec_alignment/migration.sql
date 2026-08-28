-- CreateEnum
CREATE TYPE "BookType" AS ENUM ('ROMAN', 'GRAPHIQUE');

-- CreateEnum
CREATE TYPE "TieStage" AS ENUM ('NONE', 'CAPTAIN', 'DEPUTY', 'ANY');

-- DropForeignKey
ALTER TABLE "QuestCompletion" DROP CONSTRAINT "QuestCompletion_userId_fkey";

-- DropIndex
DROP INDEX "BingoGrid_challengeId_scope_key";

-- DropIndex
DROP INDEX "Quest_challengeId_idx";

-- DropIndex
DROP INDEX "QuestCompletion_questId_userId_key";

-- AlterTable (grids become an ordered series; existing grids get order 1, 2… by creation)
ALTER TABLE "BingoGrid" DROP COLUMN "scope",
ADD COLUMN     "order" INTEGER;
UPDATE "BingoGrid" g SET "order" = r.n FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "challengeId" ORDER BY "createdAt") AS n FROM "BingoGrid"
) r WHERE r.id = g.id;
ALTER TABLE "BingoGrid" ALTER COLUMN "order" SET NOT NULL;

-- AlterTable (fills remember their grid)
ALTER TABLE "BingoFill" ADD COLUMN     "gridId" TEXT;
UPDATE "BingoFill" f SET "gridId" = c."gridId" FROM "BingoCell" c WHERE c.id = f."cellId";
ALTER TABLE "BingoFill" ALTER COLUMN "gridId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "points" DECIMAL(6,1) NOT NULL DEFAULT 0,
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "type" "BookType" NOT NULL DEFAULT 'ROMAN',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT;
-- Backfill: frozen team from current membership, effective type, stored points from the ledger
UPDATE "Book" b SET "teamId" = m."teamId" FROM "TeamMember" m WHERE m."userId" = b."userId";
UPDATE "Book" SET "type" = 'GRAPHIQUE' WHERE "isGraphic" OR "pages" < 150;
UPDATE "Book" b SET "points" = COALESCE((SELECT SUM(e."amount") FROM "PointEvent" e WHERE e."bookId" = b.id AND e.source = 'READING'), 0);

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "lastWeeklyPostAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PointEvent" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(8,1),
ALTER COLUMN "baseAmount" SET DATA TYPE DECIMAL(8,1);

-- AlterTable (quests become team-level reading quests, numbered by creation)
ALTER TABLE "Quest" DROP COLUMN "kind",
DROP COLUMN "type",
ADD COLUMN     "number" INTEGER;
UPDATE "Quest" q SET "number" = r.n FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "challengeId" ORDER BY "createdAt") AS n FROM "Quest"
) r WHERE r.id = q.id;
ALTER TABLE "Quest" ALTER COLUMN "number" SET NOT NULL;

-- AlterTable (individual completions no longer exist)
DELETE FROM "QuestCompletion" WHERE "teamId" IS NULL;
ALTER TABLE "QuestCompletion" DROP COLUMN "userId",
ALTER COLUMN "teamId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StoryNode" ADD COLUMN     "defaultChoiceId" TEXT,
ADD COLUMN     "voteHours" INTEGER;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "deputyId" TEXT,
ADD COLUMN     "jokersUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "pendingById" TEXT,
ADD COLUMN     "pendingChoiceId" TEXT,
ADD COLUMN     "tieSince" TIMESTAMP(3),
ADD COLUMN     "tieStage" "TieStage" NOT NULL DEFAULT 'NONE';

-- DropEnum
DROP TYPE "BingoScope";

-- DropEnum
DROP TYPE "QuestKind";

-- DropEnum
DROP TYPE "QuestType";

-- CreateTable
CREATE TABLE "TeamGrid" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TeamGrid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamGrid_teamId_gridId_key" ON "TeamGrid"("teamId", "gridId");

-- CreateIndex
CREATE INDEX "BingoFill_gridId_teamId_idx" ON "BingoFill"("gridId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoGrid_challengeId_order_key" ON "BingoGrid"("challengeId", "order");

-- CreateIndex
CREATE INDEX "Book_teamId_deletedAt_idx" ON "Book"("teamId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_challengeId_number_key" ON "Quest"("challengeId", "number");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_deputyId_fkey" FOREIGN KEY ("deputyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGrid" ADD CONSTRAINT "TeamGrid_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGrid" ADD CONSTRAINT "TeamGrid_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "BingoGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoFill" ADD CONSTRAINT "BingoFill_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "BingoGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

