-- CreateEnum
CREATE TYPE "BingoScope" AS ENUM ('PLAYER', 'TEAM');

-- CreateTable
CREATE TABLE "BingoGrid" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "scope" "BingoScope" NOT NULL,
    "title" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoCell" (
    "id" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,

    CONSTRAINT "BingoCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoFill" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoFill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BingoGrid_challengeId_scope_key" ON "BingoGrid"("challengeId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCell_gridId_row_col_key" ON "BingoCell"("gridId", "row", "col");

-- CreateIndex
CREATE INDEX "BingoFill_bookId_idx" ON "BingoFill"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoFill_cellId_userId_key" ON "BingoFill"("cellId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoFill_cellId_teamId_key" ON "BingoFill"("cellId", "teamId");

-- AddForeignKey
ALTER TABLE "BingoGrid" ADD CONSTRAINT "BingoGrid_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCell" ADD CONSTRAINT "BingoCell_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "BingoGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoFill" ADD CONSTRAINT "BingoFill_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "BingoCell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoFill" ADD CONSTRAINT "BingoFill_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoFill" ADD CONSTRAINT "BingoFill_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
