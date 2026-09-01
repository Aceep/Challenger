import { signOut } from "@/auth";
import { TourAutoStart } from "@/components/tour/TourAutoStart";
import { getCurrentPlayer } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getHomeSummary } from "@/lib/services/home";
import { clearCurrentChallengeCookie } from "@/lib/tenancy/cookie";
import { HomeView } from "./HomeView";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { user, team, challenge } = await getCurrentPlayer();
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
