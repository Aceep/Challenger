-- CreateTable
CREATE TABLE "BotEvent" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotEvent_pkey" PRIMARY KEY ("key")
);

