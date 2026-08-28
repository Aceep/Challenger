import { requireOrganizer } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete } from "@/lib/scoring/reading";
import { listQuestsAdmin, listQuestsForTeam } from "@/lib/services/quests";
import { QuestsAdminView, type TeamQuestProgress } from "./QuestsAdminView";
import { attachQuestBookAction, deleteQuestAction, detachQuestBookAction, saveQuestAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
/** Keep the focused team + quest when coming back from an attach/detach. */
const selected_return = (p: Record<string, string | string[] | undefined>) => {
  const q = new URLSearchParams();
  if (one(p.team)) q.set("team", one(p.team));
  if (one(p.quest)) q.set("quest", one(p.quest));
  const qs = q.toString();
  return qs ? `/admin/quests?${qs}` : "/admin/quests";
};
const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function AdminQuestsPage({ searchParams }: PageProps<"/admin/quests">) {
  const { challenge } = await requireOrganizer();
  const params = await searchParams;
  const [quests, teams, links, completions] = await Promise.all([
    listQuestsAdmin(challenge.id),
    prisma.team.findMany({ where: { challengeId: challenge.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.questBook.findMany({
      where: { quest: { challengeId: challenge.id }, book: { deletedAt: null } },
      select: { questId: true, teamId: true, book: { select: { type: true } } },
    }),
    prisma.questCompletion.findMany({ where: { quest: { challengeId: challenge.id } }, select: { questId: true, teamId: true } }),
  ]);

  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const weights = new Map<string, number[]>();
  for (const l of links) {
    const key = `${l.questId}:${l.teamId}`;
    weights.set(key, [...(weights.get(key) ?? []), bookWeight(l.book.type)]);
  }
  const edit = one(params.edit);
  const returnTo = selected_return(params);

  // Progress of one team (`?team=`), with the readings still free of any quest.
  const selected = teams.find((t) => t.id === one(params.team)) ?? null;
  let teamProgress: TeamQuestProgress | null = null;
  if (selected) {
    const [teamQuests, freeBooks] = await Promise.all([
      listQuestsForTeam(challenge.id, selected.id),
      prisma.book.findMany({
        where: { teamId: selected.id, deletedAt: null, questBook: null },
        orderBy: { finishedAt: "desc" },
        include: { user: { select: { name: true } } },
      }),
    ]);
    teamProgress = {
      teamId: selected.id,
      teamName: selected.name,
      quests: teamQuests.map((q) => ({
        id: q.id,
        number: q.number,
        title: q.title,
        points: q.points,
        open: q.open,
        done: q.done,
        progress: q.done ? 1 : q.progress,
        linkedBooks: q.linkedBooks,
      })),
      freeBooks: freeBooks.map((b) => ({ id: b.id, label: `${b.user.name ?? "?"} — ${b.title}${b.type === "GRAPHIQUE" ? " (½)" : ""}` })),
    };
  }

  return (
    <QuestsAdminView
      quests={quests.map((q) => ({
        id: q.id,
        number: q.number,
        title: q.title,
        description: q.description ?? "",
        points: q.points,
        openAt: toLocalInput(q.openAt),
        closeAt: toLocalInput(q.closeAt),
        targetTeamId: q.targetTeamId ?? "",
        window: [q.openAt ? `ouvre le ${dateFmt.format(q.openAt)}` : "", q.closeAt ? `→ ${dateFmt.format(q.closeAt)}` : ""].filter(Boolean).join(" · ") || "—",
        target: q.targetTeam?.name ?? "toutes",
        fromStory: q.origin === "STORY",
        progress: teams
          .map((t) => {
            const done = completions.some((c) => c.questId === q.id && c.teamId === t.id);
            const w = weights.get(`${q.id}:${t.id}`) ?? [];
            if (done || isComplete(w)) return { teamId: t.id, team: t.name, state: "done" as const };
            if (w.length > 0) return { teamId: t.id, team: t.name, state: "half" as const };
            return null;
          })
          .filter((x): x is { teamId: string; team: string; state: "done" | "half" } => x !== null),
      }))}
      teams={teams.map((t) => ({ id: t.id, name: teamName.get(t.id) ?? t.name }))}
      hasChallenge
      editingId={edit || null}
      creating={one(params.new) === "1"}
      nextNumber={quests.reduce((n, q) => Math.max(n, q.number), 0) + 1}
      params={params}
      teamProgress={teamProgress}
      selectedQuestId={one(params.quest) || null}
      saveQuestAction={saveQuestAction}
      deleteQuestAction={deleteQuestAction}
      attachQuestBookAction={attachQuestBookAction.bind(null, returnTo)}
      detachQuestBookAction={detachQuestBookAction.bind(null, returnTo)}
    />
  );
}
