import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { botInviteUrl, discordSetupState } from "@/lib/discord/permissions";
import { ChallengeView } from "./ChallengeView";
import { saveChallengeAction, setupDiscordAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminChallengePage({ searchParams }: PageProps<"/admin/challenge">) {
  await requireAdmin();
  const params = await searchParams;
  const challenges = await prisma.challenge.findMany({ orderBy: { startAt: "desc" } });
  const current = challenges.find((c) => c.status === "ACTIVE") ?? challenges[0] ?? null;
  const teams = current
    ? await prisma.team.findMany({
        where: { challengeId: current.id },
        select: { discordRoleId: true, discordChannelId: true, discordLibraryChannelId: true },
      })
    : [];
  const appId = process.env.AUTH_DISCORD_ID;

  return (
    <ChallengeView
      challenge={
        current
          ? {
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
            }
          : null
      }
      editions={challenges.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        period: `${dateFmt.format(c.startAt)} → ${dateFmt.format(c.endAt)}`,
        status: c.status,
      }))}
      discord={{
        ...discordSetupState(current, teams),
        inviteUrl: appId ? botInviteUrl(appId, current?.discordGuildId) : null,
      }}
      params={params}
      saveChallengeAction={saveChallengeAction}
      setupDiscordAction={setupDiscordAction}
    />
  );
}
