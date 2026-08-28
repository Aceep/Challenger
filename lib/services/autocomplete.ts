import "server-only";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete } from "@/lib/scoring/reading";
import { activeGridForTeam, cellLabel } from "@/lib/services/bingo";
import { isQuestOpen } from "@/lib/services/quests";

/** Discord autocomplete choices (≤ 25). Also used to fill web selects when `q` is empty. */
export type Choice = { name: string; value: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const matches = (label: string, q: string) => !q || norm(label).includes(norm(q));

/** Open quests the team can still attach a reading to ("#3 — titre (½ fait) — 20 pts"). */
export async function questChoices(challengeId: string, teamId: string, q = ""): Promise<Choice[]> {
  const quests = await prisma.quest.findMany({
    where: { challengeId, OR: [{ targetTeamId: null }, { targetTeamId: teamId }] },
    orderBy: { number: "asc" },
    include: { books: { where: { teamId, book: { deletedAt: null } }, include: { book: { select: { type: true } } } } },
  });
  return quests
    .filter((quest) => isQuestOpen(quest))
    .map((quest) => ({ quest, weights: quest.books.map((b) => bookWeight(b.book.type)) }))
    .filter(({ weights }) => !isComplete(weights))
    .map(({ quest, weights }) => ({ name: `#${quest.number} — ${quest.title}${weights.length ? " (½ fait)" : ""} — ${quest.points} pts`.slice(0, 100), value: quest.id }))
    .filter((c) => matches(c.name, q))
    .slice(0, 25);
}

/** Cells of the team's active grid that are not validated yet ("B3 — consigne (½ fait)"). */
export async function cellChoices(teamId: string, q = ""): Promise<Choice[]> {
  const grid = await prisma.$transaction((tx) => activeGridForTeam(tx, teamId));
  if (!grid) return [];
  const cells = await prisma.bingoCell.findMany({
    where: { gridId: grid.id },
    orderBy: [{ row: "asc" }, { col: "asc" }],
    include: { fills: { where: { teamId, book: { deletedAt: null } }, include: { book: { select: { type: true } } } } },
  });
  return cells
    .filter((c) => !isComplete(c.fills.map((f) => bookWeight(f.book.type))))
    .map((c) => ({ name: `${cellLabel(c.row, c.col)} — ${c.prompt}${c.fills.length ? " (½ fait)" : ""}`.slice(0, 100), value: c.id }))
    .filter((c) => matches(c.name, q))
    .slice(0, 25);
}

/** Readings the actor may edit: own recent ones, plus the whole team's for the captain. */
export async function editableBookChoices(actor: { id: string; teamId: string | null; isCaptain: boolean }, q = ""): Promise<Choice[]> {
  const books = await prisma.book.findMany({
    where: { deletedAt: null, ...(actor.isCaptain && actor.teamId ? { teamId: actor.teamId } : { userId: actor.id }) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });
  return books
    .map((b) => ({ name: `${b.title} — ${b.author} (${b.user.name ?? "?"}, ${fmt.format(b.finishedAt)})`.slice(0, 100), value: b.id }))
    .filter((c) => matches(c.name, q))
    .slice(0, 25);
}
