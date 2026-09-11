-- Inviter sans identifiant : Kyle écrit désormais à la personne invitée
-- (`Invite.notifiedAt`, posé une seule fois quand le message privé part), et
-- la pose des rôles Discord devient reprenable (`ChallengeMember.
-- discordRoleSyncedAt`, remis à null dès qu'une équipe ou un rôle change).
-- Purement additif : les lignes existantes restent nulles, donc « à faire ».

-- AlterTable
ALTER TABLE "ChallengeMember" ADD COLUMN     "discordRoleSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "notifiedAt" TIMESTAMP(3);
