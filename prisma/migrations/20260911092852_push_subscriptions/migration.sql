-- Web push notifications: one row per browser that accepted them (the endpoint
-- is the identity), and the categories each person turned off on their account.
-- Purely additive: an empty `pushMuted` means « everything is received », so
-- every existing account is subscribed to nothing and muted to nothing.
-- CreateEnum
CREATE TYPE "PushCategory" AS ENUM ('STORY', 'QUESTIONS', 'ORGANIZER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushMuted" "PushCategory"[] DEFAULT ARRAY[]::"PushCategory"[];

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
