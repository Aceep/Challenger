import { getActiveChallenge } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete } from "@/lib/scoring/reading";
import { listQuestsAdmin } from "@/lib/services/quests";
import { QuestsAdminView } from "./QuestsAdminView";
import { deleteQuestAction, saveQuestAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function AdminQuestsPage({ searchParams }: PageProps<"/admin/quests">) {
  const params = await searchParams;
  const challenge = await getActiveChallenge();
  const actions = { saveQuestAction, deleteQuestAction };
  if (!challenge) return <QuestsAdminView quests={[]} teams={[]} hasChallenge={false} editingId={null} params={params} {...actions} />;

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
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;

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
            if (done || isComplete(w)) return { team: t.name, state: "done" as const };
            if (w.length > 0) return { team: t.name, state: "half" as const };
            return null;
          })
          .filter((x): x is { team: string; state: "done" | "half" } => x !== null),
      }))}
      teams={teams.map((t) => ({ id: t.id, name: teamName.get(t.id) ?? t.name }))}
      hasChallenge
      editingId={edit ?? null}
      params={params}
      {...actions}
    />
  );
}
