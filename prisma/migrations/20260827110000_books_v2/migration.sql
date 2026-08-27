-- Books v2: bingo becomes team-only (player grids removed), cells hold up to 2 books, quests get a kind.
DELETE FROM "BingoFill" WHERE "userId" IS NOT NULL OR "teamId" IS NULL;
DELETE FROM "BingoGrid" WHERE "scope" = 'PLAYER';

-- CreateEnum
CREATE TYPE "QuestKind" AS ENUM ('ACTION', 'LECTURE');

-- DropIndex
DROP INDEX "BingoFill_bookId_idx";

-- DropIndex
DROP INDEX "BingoFill_cellId_teamId_key";

-- DropIndex
DROP INDEX "BingoFill_cellId_userId_key";

-- AlterTable
ALTER TABLE "BingoFill" DROP COLUMN "userId",
ALTER COLUMN "teamId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "kind" "QuestKind" NOT NULL DEFAULT 'ACTION';

-- CreateTable
CREATE TABLE "QuestBook" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestBook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestBook_bookId_key" ON "QuestBook"("bookId");

-- CreateIndex
CREATE INDEX "QuestBook_questId_teamId_idx" ON "QuestBook"("questId", "teamId");

-- CreateIndex
CREATE INDEX "QuestBook_questId_userId_idx" ON "QuestBook"("questId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoFill_bookId_key" ON "BingoFill"("bookId");

-- CreateIndex
CREATE INDEX "BingoFill_cellId_teamId_idx" ON "BingoFill"("cellId", "teamId");

-- AddForeignKey
ALTER TABLE "QuestBook" ADD CONSTRAINT "QuestBook_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestBook" ADD CONSTRAINT "QuestBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

