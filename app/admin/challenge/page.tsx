import { requireOrganizer } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { listOrganizedChallenges } from "@/lib/services/membership";
import { botInviteUrl, discordSetupState } from "@/lib/discord/permissions";
import { ChallengeView } from "./ChallengeView";
import { saveChallengeAction, setupDiscordAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminChallengePage({ searchParams }: PageProps<"/admin/challenge">) {
  const { user, challenge: current } = await requireOrganizer();
  const params = await searchParams;
  // Only the editions this organiser runs — every edition for a super-admin.
  const challenges = await listOrganizedChallenges(user.id);
  const teams = await prisma.team.findMany({
    where: { challengeId: current.id },
    select: { discordRoleId: true, discordChannelId: true, discordLibraryChannelId: true },
  });
  const appId = process.env.AUTH_DISCORD_ID;

  return (
    <ChallengeView
      challenge={{
        id: current.id,
        name: current.name,
        startAt: current.startAt.toISOString().slice(0, 10),
        endAt: current.endAt.toISOString().slice(0, 10),
        color: current.color,
        pointsPerPage: current.pointsPerPage,
        bingoLineBonus: current.bingoLineBonus,
        bingoFullBonus: current.bingoFullBonus,
        status: current.status,
        discordGuildId: current.discordGuildId,
        discordGeneralChannelId: current.discordGeneralChannelId,
      }}
      editions={challenges.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        period: `${dateFmt.format(c.startAt)} → ${dateFmt.format(c.endAt)}`,
        status: c.status,
      }))}
      discord={{
        ...discordSetupState(current, teams),
        inviteUrl: appId ? botInviteUrl(appId, current.discordGuildId) : null,
      }}
      params={params}
      saveChallengeAction={saveChallengeAction}
      setupDiscordAction={setupDiscordAction}
    />
  );
}
