import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { cellLabel } from "@/lib/services/bingo";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { num } from "@/lib/services/points";
import { dormantTeams, tiedVotes } from "@/lib/services/story";
import { dueSundayKey, parisInstant } from "@/lib/time/paris";
import { DashboardView, type DashboardViewProps } from "./DashboardView";

const WEEK = 7 * 86_400_000;
const relFmt = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function ago(date: Date, now: Date) {
  const min = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (min < 60) return `il y a ${min} min`;
  if (min < 60 * 24) return `il y a ${Math.round(min / 60)} h`;
  return dateTimeFmt.format(date);
}

function inWords(target: Date, now: Date) {
  const h = Math.round((target.getTime() - now.getTime()) / 3_600_000);
  if (h < 24) return relFmt.format(h, "hour");
  return `dans ${Math.floor(h / 24)} j ${h % 24} h`;
}

export default async function AdminHome() {
  await requireAdmin();
  const now = new Date();
  const challenge = await getActiveChallenge();
  const since = new Date(now.getTime() - WEEK);

  const [books, recentCount, players, activePlayers, recent, lastTick, weekly] = await Promise.all([
    prisma.book.count({ where: { deletedAt: null, ...(challenge ? { team: { challengeId: challenge.id } } : {}) } }),
    prisma.book.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
    prisma.user.count(),
    prisma.book.findMany({ where: { createdAt: { gte: since } }, distinct: ["userId"], select: { userId: true } }),
    prisma.book.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true } },
        team: { select: { name: true } },
        questBook: { select: { quest: { select: { number: true } } } },
        bingoFill: { select: { cell: { select: { row: true, col: true } } } },
      },
    }),
    prisma.botEvent.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.botEvent.findFirst({ where: { key: { startsWith: "weekly:" } }, orderBy: { createdAt: "desc" } }),
  ]);

  const [rows, ties, dormant, pointSum] = challenge
    ? await Promise.all([
        getLeaderboard(challenge.id),
        tiedVotes(now),
        dormantTeams(7, now),
        prisma.pointEvent.aggregate({ where: { createdAt: { gte: challenge.startAt, lte: challenge.endAt } }, _sum: { amount: true } }),
      ])
    : [[], [], [], null];

  const todo: DashboardViewProps["todo"] = [
    ...ties.map((t) => ({
      id: `tie-${t.id}`,
      tone: "wait" as const,
      icon: "⚖️",
      text: `${t.teamName} — égalité en cours, cascade au stade ${t.stage === "CAPTAIN" ? "capitaine" : t.stage === "DEPUTY" ? "adjoint·e" : "tous les membres"}${t.pending ? " (un choix attend confirmation)" : ""}.`,
      href: "/admin/story",
    })),
    ...dormant.map((d) => ({
      id: `dormant-${d.teamId}`,
      tone: "no" as const,
      icon: "📖",
      text: `Chapitre « ${d.title} » dormant depuis 7 jours${d.reason ? ` — ${d.reason}` : ""}.`,
      href: "/admin/story",
    })),
    ...(weekly
      ? [
          {
            id: "weekly",
            tone: "ok" as const,
            icon: "✅",
            text: `Dernier classement publié ${dateTimeFmt.format(weekly.createdAt)} · fenêtre de vérification annoncée.`,
          },
        ]
      : []),
  ];

  const nextSunday = parisInstant(dueSundayKey(now), 20);
  const target = nextSunday > now ? nextSunday : new Date(nextSunday.getTime() + WEEK);
  const weeks = challenge ? Math.max(1, Math.ceil((challenge.endAt.getTime() - challenge.startAt.getTime()) / WEEK)) : 0;
  const week = challenge ? Math.min(weeks, Math.max(1, Math.ceil((now.getTime() - challenge.startAt.getTime()) / WEEK))) : 0;

  return (
    <DashboardView
      challenge={challenge ? { name: challenge.name, color: challenge.color, week, weeks } : null}
      kpis={{
        books,
        booksLast7: recentCount,
        points: pointSum ? num(pointSum._sum.amount) : 0,
        activePlayers: activePlayers.length,
        players,
        nextLeaderboard: dayFmt.format(target),
        nextIn: inWords(target, now),
      }}
      todo={todo}
      leaderboard={rows.map((r) => ({ teamId: r.teamId, name: r.name, color: r.color, points: r.points, rank: r.rank }))}
      bot={{
        lastTickLabel: lastTick ? `Dernier tick ${ago(lastTick.createdAt, now)}` : "Aucun tick enregistré",
        cron: "cron Vercel quotidien · /api/cron/tick pour l'heure précise",
      }}
      recentBooks={recent.map((b) => ({
        id: b.id,
        when: ago(b.updatedAt, now),
        who: `${b.user.name ?? "?"}${b.team ? ` · ${b.team.name}` : ""}`,
        title: `${b.title} — ${b.author}, ${b.pages} p.`,
        type: b.deletedAt ? null : b.type,
        points: b.deletedAt ? -num(b.points) : num(b.points),
        links: [
          b.questBook ? `quête #${b.questBook.quest.number} ✅` : "",
          b.bingoFill ? `case ${cellLabel(b.bingoFill.cell.row, b.bingoFill.cell.col)} ✅` : "",
          b.deletedAt ? "annulation" : "",
        ]
          .filter(Boolean)
          .join(" · "),
        deleted: !!b.deletedAt,
      }))}
    />
  );
}
