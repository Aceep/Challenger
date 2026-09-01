import { requireOrganizer } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getReadingAdmin, listReadingsAdmin } from "@/lib/services/admin-readings";
import { cellChoices, questChoices } from "@/lib/services/autocomplete";
import { questLabel } from "@/lib/services/quests";
import { ReadingsView, type AdminReadingRow } from "./ReadingsView";
import { deleteReadingAction, updateReadingAction } from "./actions";

const updatedFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminReadingsPage({ searchParams }: PageProps<"/admin/readings">) {
  const { challenge } = await requireOrganizer();
  const params = await searchParams;
  const actions = { updateReadingAction, deleteReadingAction };
  const filters = { teamId: one(params.team), userId: one(params.user), q: one(params.q), deleted: one(params.deleted) === "1" };

  const page = Math.max(1, Number(one(params.page)) || 1);
  const [listing, teams, members] = await Promise.all([
    listReadingsAdmin(challenge.id, { ...filters, page }),
    prisma.team.findMany({ where: { challengeId: challenge.id }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    prisma.teamMember.findMany({
      where: { challengeId: challenge.id },
      orderBy: { user: { name: "asc" } },
      select: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const editId = one(params.edit);
  const book = editId ? await getReadingAdmin(editId) : null;
  const editable = book && !book.deleted ? book : null;
  const ownerTeam = editable?.team ? await prisma.team.findUniqueOrThrow({ where: { id: editable.team.id }, select: { id: true, challengeId: true } }) : null;
  const [quests, cells] = ownerTeam ? await Promise.all([questChoices(ownerTeam.challengeId, ownerTeam.id), cellChoices(ownerTeam.id)]) : [[], []];

  const rows: AdminReadingRow[] = listing.books.map((b) => ({
    id: b.id,
    finishedAt: b.finishedAt,
    teamName: b.team?.name ?? null,
    teamColor: b.team?.color ?? null,
    owner: b.user.name ?? "?",
    title: b.title,
    author: b.author,
    pages: b.pages,
    type: b.type,
    points: b.points,
    coverUrl: b.coverUrl,
    questNumber: b.questBook?.quest.number ?? null,
    questHalf: b.type === "GRAPHIQUE",
    cellLabel: b.cellLabel,
    cellHalf: b.type === "GRAPHIQUE",
    updatedLabel: `${b.updatedBy?.name ?? b.user.name ?? "?"} · ${updatedFmt.format(b.updatedAt)}`,
    deleted: b.deleted,
  }));

  return (
    <ReadingsView
      readings={rows}
      teams={teams}
      players={members.map((m) => ({ id: m.user.id, name: m.user.name ?? "?" }))}
      filters={filters}
      page={listing.page}
      pages={listing.pages}
      total={listing.total}
      hasChallenge
      editing={
        editable
          ? {
              id: editable.id,
              title: editable.title,
              author: editable.author,
              pages: editable.pages,
              type: editable.isGraphic ? "GRAPHIQUE" : "ROMAN",
              coverUrl: editable.coverUrl,
              finishedAt: editable.finishedAt.toISOString().slice(0, 10),
              questId: editable.questBook?.questId ?? "",
              cellId: editable.bingoFill?.cellId ?? "",
              owner: editable.user.name ?? "?",
              teamName: editable.team?.name ?? null,
              quests,
              cells,
              currentQuest: editable.questBook ? { value: editable.questBook.questId, name: questLabel(editable.questBook.quest) } : null,
              currentCell: editable.bingoFill
                ? { value: editable.bingoFill.cellId, name: `${editable.cellLabel} — ${editable.bingoFill.cell.prompt}` }
                : null,
            }
          : null
      }
      params={params}
      {...actions}
    />
  );
}
