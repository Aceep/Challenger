-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "discordAdminRoleId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "discordRoleId" TEXT;
