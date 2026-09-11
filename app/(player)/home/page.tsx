import { redirect } from "next/navigation";
import { after } from "next/server";
import { signOut } from "@/auth";
import { TourAutoStart } from "@/components/tour/TourAutoStart";
import { getCurrentPlayer } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { botInviteUrl } from "@/lib/discord/permissions";
import { syncMemberRoles } from "@/lib/services/discord-setup";
import { getHomeSummary } from "@/lib/services/home";
import { consumePendingInvites } from "@/lib/services/membership";
import { clearCurrentChallengeCookie } from "@/lib/tenancy/cookie";
import { HomeView } from "./HomeView";

/** Welcome flash, French typography: « Bienvenue dans « X » ! ». */
const welcomeFlash = (name: string) => `Bienvenue dans « ${name} » !`;

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { user, team, challenge } = await getCurrentPlayer();

  // No edition: an invitation may have arrived since the last sign-in. It is
  // consumed here rather than demanding a sign-out — a bounded write (someone
  // without a challenge, a pending invitation), idempotent, followed by a
  // redirect that re-reads everything cleanly.
  if (!challenge && user.discordId) {
    const joined = await consumePendingInvites(user.id, user.discordId);
    if (joined.length) {
      const userId = user.id;
      after(() => Promise.all(joined.map((id) => syncMemberRoles(userId, id))));
      const first = await prisma.challenge.findUnique({ where: { id: joined[0] }, select: { name: true } });
      redirect(`/home?ok=${encodeURIComponent(welcomeFlash(first?.name ?? "ton défi"))}`);
    }
  }

  const [summary, me_] = await Promise.all([
    getHomeSummary(user.id, challenge?.id ?? null, team && challenge ? { id: team.id, challengeId: challenge.id, startAt: challenge.startAt, endAt: challenge.endAt } : null),
    // Read from the database, not the JWT: the flag must flip on the very next render.
    prisma.user.findUnique({ where: { id: user.id }, select: { onboardedAt: true } }),
  ]);
  const { rows, score } = summary;
  const me = rows.findIndex((r) => r.teamId === team?.id);
  const ahead = me > 0 ? rows[me - 1] : null;

  return (
    <>
      {/* The visit talks about a team, a bingo and a story: pointless without an edition. */}
      {challenge && !me_?.onboardedAt && <TourAutoStart tour="player" base="" />}
      <HomeView
        userName={user.name ?? "lecteur·ice"}
        team={team ? { name: team.name, color: team.color } : null}
        challengeName={challenge?.name ?? null}
        installUrl={process.env.AUTH_DISCORD_ID ? botInviteUrl(process.env.AUTH_DISCORD_ID) : null}
        challengeOver={!!challenge && challenge.endAt < new Date()}
        score={score}
        rank={
          me >= 0
            ? { position: rows[me].rank, total: rows.length, gapPoints: ahead ? Math.round((ahead.points - rows[me].points) * 10) / 10 : 0, ahead: ahead?.name ?? "" }
            : null
        }
        params={await searchParams}
        stats={summary.stats}
        week={summary.week}
        signOutAction={async () => {
          "use server";
          // The edition is a session preference: the next person to log in on
          // this browser must not inherit it.
          await clearCurrentChallengeCookie();
          await signOut({ redirectTo: "/login" });
        }}
      />
    </>
  );
}
