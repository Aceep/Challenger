import { after } from "next/server";
import { LiveRefresh } from "@/components/LiveRefresh";
import { syncVoteMessage } from "@/lib/discord/events";
import { getCurrentPlayer } from "@/lib/dal";
import { getTeamStoryView } from "@/lib/services/story";
import { chooseTargetAction, voteAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function StoryPage() {
  const { user, team } = await getCurrentPlayer();
  const view = team ? await getTeamStoryView(team.id, user.id) : null;

  if (!team || !view) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold">Histoire</h1>
        <p className="text-slate-500">{team ? "L'histoire n'a pas encore commencé." : "Rejoins une équipe pour vivre l'histoire."}</p>
      </main>
    );
  }

  const { node, vote, choices, unmet } = view;
  if (vote?.status === "OPEN") after(() => syncVoteMessage(vote.id));

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <LiveRefresh seconds={15} />
      <header>
        <p className="text-sm text-slate-500">{view.story.title} · {team.name}</p>
        <h1 className="text-2xl font-bold">{node.title}</h1>
      </header>

      <article className="whitespace-pre-line rounded-2xl bg-white p-5 leading-relaxed shadow-sm dark:bg-slate-900">{node.body}</article>

      {node.isEnding && <p className="text-center text-lg font-semibold">✨ Fin de votre histoire</p>}

      {!node.isEnding && unmet.length > 0 && (
        <section className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4 text-sm dark:bg-amber-950">
          <p className="font-semibold">🔒 Pour continuer, votre équipe doit :</p>
          <ul className="mt-1 list-inside list-disc">
            {unmet.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </section>
      )}

      {vote?.status === "AWAITING_TARGET" && (
        <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <p className="font-semibold">Choix retenu : {vote.resultChoice?.label}</p>
          {view.isCaptain || user.role === "ADMIN" ? (
            <form action={chooseTargetAction} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="voteId" value={vote.id} />
              <label className="text-sm">
                Quelle équipe visez-vous ?
                <select name="targetTeamId" required defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {view.rivals.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="rounded-lg bg-indigo-600 py-2 font-semibold text-white">Confirmer la cible</button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Le·la capitaine doit désigner l&apos;équipe visée.</p>
          )}
        </section>
      )}

      {vote?.status === "OPEN" && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Que fait votre équipe ?</h2>
          <p className="text-xs text-slate-500">
            Vote ouvert jusqu&apos;au {dateFmt.format(vote.deadline)} · {vote.ballots} vote{vote.ballots > 1 ? "s" : ""}
            {vote.myChoiceId && " · tu as voté"}
          </p>
          {choices.map((c) => (
            <form key={c.id} action={voteAction}>
              <input type="hidden" name="voteId" value={vote.id} />
              <input type="hidden" name="choiceId" value={c.id} />
              <button
                disabled={c.locked}
                className={`w-full rounded-xl border-2 p-3 text-left transition disabled:opacity-50 ${
                  vote.myChoiceId === c.id ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <p className="font-semibold">
                  {c.locked && "🔒 "}
                  {c.label}
                </p>
                {c.lockReason && <p className="text-xs text-slate-500">{c.lockReason}</p>}
                {c.effects.length > 0 && <p className="text-xs text-indigo-700 dark:text-indigo-300">{c.effects.join(" · ")}</p>}
                {c.votes.length > 0 && <p className="mt-1 text-xs text-slate-500">Votes : {c.votes.join(", ")}</p>}
              </button>
            </form>
          ))}
          {view.allies.length > 0 && <p className="text-xs text-slate-500">Alliés qui peuvent voter avec vous : {view.allies.map((a) => a.name).join(", ")}</p>}
        </section>
      )}

      {view.history.length > 1 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Votre parcours</h2>
          <ol className="flex flex-col gap-1 text-sm">
            {view.history.map((h, i) => (
              <li key={i} className="text-slate-600 dark:text-slate-400">
                {h.choiceLabel ? `→ « ${h.choiceLabel} » · ` : ""}
                {h.title}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
