import "server-only";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete } from "@/lib/scoring/reading";
import { cellLabel } from "@/lib/services/bingo";
import { isQuestOpen } from "@/lib/services/quests";

/** Discord autocomplete choices (≤ 25). Also used to fill web selects when `q` is empty. */
export type Choice = { name: string; value: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const matches = (label: string, q: string) => !q || norm(label).includes(norm(q));

/** Open LECTURE quests the player can still attach a book to (own or team progress not complete). */
export async function lectureQuestChoices(challengeId: string, userId: string, teamId: string, q = ""): Promise<Choice[]> {
  const quests = await prisma.quest.findMany({
    where: { challengeId, kind: "LECTURE", OR: [{ targetTeamId: null }, { targetTeamId: teamId }] },
    orderBy: { title: "asc" },
    include: { books: { where: { OR: [{ userId }, { teamId }] }, include: { book: { select: { isGraphic: true } } } } },
  });
  return quests
    .filter((quest) => isQuestOpen(quest))
    .map((quest) => {
      const mine = quest.books.filter((b) => (quest.type === "INDIVIDUAL" ? b.userId === userId : b.teamId === teamId));
      const weight = mine.reduce((n, b) => n + bookWeight(b.book.isGraphic), 0);
      return { quest, weight, complete: isComplete(mine.map((b) => bookWeight(b.book.isGraphic))) };
    })
    .filter(({ complete }) => !complete)
    .map(({ quest, weight }) => ({ name: `${quest.title}${weight > 0 ? " (½ fait)" : ""} — ${quest.points} pts`, value: quest.id }))
    .filter((c) => matches(c.name, q))
    .slice(0, 25);
}

/** Team bingo cells that are not complete yet. */
export async function cellChoices(challengeId: string, teamId: string, q = ""): Promise<Choice[]> {
  const grid = await prisma.bingoGrid.findUnique({
    where: { challengeId_scope: { challengeId, scope: "TEAM" } },
    include: { cells: { orderBy: [{ row: "asc" }, { col: "asc" }], include: { fills: { where: { teamId }, include: { book: { select: { isGraphic: true } } } } } } },
  });
  if (!grid) return [];
  return grid.cells
    .filter((c) => !isComplete(c.fills.map((f) => bookWeight(f.book.isGraphic))))
    .map((c) => ({ name: `${cellLabel(c.row, c.col)} — ${c.prompt}${c.fills.length ? " (½ fait)" : ""}`.slice(0, 100), value: c.id }))
    .filter((c) => matches(c.name, q))
    .slice(0, 25);
}

/** Books the actor may edit: own recent ones, plus the whole team's for the captain. */
export async function editableBookChoices(actor: { id: string; teamId: string | null; isCaptain: boolean }, q = ""): Promise<Choice[]> {
  const books = await prisma.book.findMany({
    where: actor.isCaptain && actor.teamId ? { user: { membership: { teamId: actor.teamId } } } : { userId: actor.id },
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
