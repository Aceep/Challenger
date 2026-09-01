-- Cover of a reading, picked in the OpenLibrary autocomplete (nullable: every
-- existing reading and the whole Discord flow simply have none).
-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "coverUrl" TEXT;
