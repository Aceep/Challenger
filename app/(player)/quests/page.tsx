import { getActiveChallenge, getCurrentPlayer } from "@/lib/dal";
import { listQuestsForPlayer } from "@/lib/services/quests";
import { completeQuestAction, uncompleteQuestAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function QuestsPage() {
  const { user, team } = await getCurrentPlayer();
  const challenge = team?.challenge ?? (await getActiveChallenge());
  if (!challenge) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold">Quêtes</h1>
        <p className="text-slate-500">Aucun défi actif.</p>
      </main>
    );
  }

  const quests = await listQuestsForPlayer(challenge.id, user.id, team?.id ?? null);
  const isCaptain = team?.captainId === user.id || user.role === "ADMIN";
  const open = quests.filter((q) => q.open);
  const closed = quests.filter((q) => !q.open);

  const Card = ({ q }: { q: (typeof quests)[number] }) => {
    const canToggle = q.open && !!team && (q.type === "INDIVIDUAL" || isCaptain);
    return (
      <li className={`rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900 ${q.done ? "opacity-70" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">
              {q.done && "✅ "}
              {q.title}
            </p>
            <p className="text-xs text-slate-500">
              {q.type === "TEAM" ? "Quête d'équipe" : "Quête individuelle"} · {q.points} pts
              {q.targetTeamId && " · spéciale pour ton équipe"}
              {q.closeAt && ` · jusqu'au ${dateFmt.format(q.closeAt)}`}
              {q.openAt && q.openAt > new Date() && ` · ouvre le ${dateFmt.format(q.openAt)}`}
            </p>
          </div>
          {canToggle && (
            <form action={q.done ? uncompleteQuestAction : completeQuestAction}>
              <input type="hidden" name="questId" value={q.id} />
              <button
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  q.done ? "border border-slate-300 text-slate-600 dark:border-slate-700" : "bg-indigo-600 text-white"
                }`}
              >
                {q.done ? "Annuler" : "Fait !"}
              </button>
            </form>
          )}
        </div>
        {q.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{q.description}</p>}
        {q.type === "TEAM" && !isCaptain && q.open && !q.done && (
          <p className="mt-2 text-xs text-slate-500">Le·la capitaine valide les quêtes d&apos;équipe.</p>
        )}
        {q.type === "INDIVIDUAL" && q._count.completions > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {q._count.completions} joueur{q._count.completions > 1 ? "s" : ""} l&apos;ont faite
          </p>
        )}
      </li>
    );
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <h1 className="text-2xl font-bold">Quêtes</h1>
      {open.length === 0 ? (
        <p className="text-slate-500">Aucune quête ouverte pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((q) => (
            <Card key={q.id} q={q} />
          ))}
        </ul>
      )}
      {closed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Fermées / à venir</h2>
          <ul className="flex flex-col gap-3">
            {closed.map((q) => (
              <Card key={q.id} q={q} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
