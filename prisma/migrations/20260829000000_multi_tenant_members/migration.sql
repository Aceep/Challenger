-- Multi-tenant step 1: per-challenge roles, multi-membership, guild → challenge resolution.

-- 1. Per-challenge role -----------------------------------------------------
CREATE TYPE "ChallengeRole" AS ENUM ('ORGANIZER', 'PLAYER');

CREATE TABLE "ChallengeMember" (
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChallengeRole" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeMember_pkey" PRIMARY KEY ("challengeId","userId")
);

CREATE INDEX "ChallengeMember_userId_idx" ON "ChallengeMember"("userId");

ALTER TABLE "ChallengeMember" ADD CONSTRAINT "ChallengeMember_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeMember" ADD CONSTRAINT "ChallengeMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. TeamMember: one team per person *and per challenge* --------------------
ALTER TABLE "TeamMember" ADD COLUMN "challengeId" TEXT;

UPDATE "TeamMember" tm
   SET "challengeId" = t."challengeId"
  FROM "Team" t
 WHERE t."id" = tm."teamId";

ALTER TABLE "TeamMember" ALTER COLUMN "challengeId" SET NOT NULL;

ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_pkey";
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("userId","challengeId");

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Backfill the memberships ----------------------------------------------
-- (a) Global admins become organisers of every existing challenge.
INSERT INTO "ChallengeMember" ("challengeId", "userId", "role")
SELECT c."id", u."id", 'ORGANIZER'::"ChallengeRole"
  FROM "Challenge" c
 CROSS JOIN "User" u
 WHERE u."role" = 'ADMIN'
    ON CONFLICT DO NOTHING;

-- (b) Team members become players of their own challenge.
INSERT INTO "ChallengeMember" ("challengeId", "userId", "role")
SELECT tm."challengeId", tm."userId", 'PLAYER'::"ChallengeRole"
  FROM "TeamMember" tm
    ON CONFLICT DO NOTHING;

-- (c) Everybody still without a membership joins the reference challenge
--     (ACTIVE first, else the latest startAt).
INSERT INTO "ChallengeMember" ("challengeId", "userId", "role")
SELECT ref."id", u."id", 'PLAYER'::"ChallengeRole"
  FROM "User" u
 CROSS JOIN (
        SELECT "id" FROM "Challenge"
         ORDER BY ("status" = 'ACTIVE') DESC, "startAt" DESC
         LIMIT 1
      ) ref
 WHERE NOT EXISTS (SELECT 1 FROM "ChallengeMember" cm WHERE cm."userId" = u."id")
    ON CONFLICT DO NOTHING;

-- 4. User.role → User.isSuperAdmin ------------------------------------------
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "isSuperAdmin" = true WHERE "role" = 'ADMIN';

ALTER TABLE "Invite" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Invite"
    ALTER COLUMN "role" TYPE "ChallengeRole"
    USING (CASE WHEN "role" = 'ADMIN' THEN 'ORGANIZER' ELSE 'PLAYER' END)::"ChallengeRole";
ALTER TABLE "Invite" ALTER COLUMN "role" SET DEFAULT 'PLAYER';

ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";

-- 5. Challenge: creator and guild lookup ------------------------------------
ALTER TABLE "Challenge" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Challenge_discordGuildId_idx" ON "Challenge"("discordGuildId");
