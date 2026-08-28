import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { ChallengeView } from "./ChallengeView";
import { saveChallengeAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminChallengePage() {
  await requireAdmin();
  const challenges = await prisma.challenge.findMany({ orderBy: { startAt: "desc" } });
  const current = challenges.find((c) => c.status === "ACTIVE") ?? challenges[0] ?? null;

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
      saveChallengeAction={saveChallengeAction}
    />
  );
}
