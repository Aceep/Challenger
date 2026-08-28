import { Card, Eyebrow, KyleEmpty } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Flash } from "@/components/Flash";
import { LiveRefresh } from "@/components/LiveRefresh";

export type StoryChoice = { id: string; label: string; locked: boolean; lockReason: string | null; effects: string[]; votes: string[] };

export type StoryViewProps = {
  storyTitle: string | null;
  teamName: string | null;
  teamColor: string;
  node: { title: string; body: string; isEnding: boolean } | null;
  unmet: string[];
  choices: StoryChoice[];
  vote: {
    id: string;
    status: "OPEN" | "AWAITING_TARGET" | "RESOLVED";
    deadline: Date;
    myChoiceId: string | null;
    ballots: number;
    resultChoice: { id: string; label: string } | null;
    tie: { stage: "CAPTAIN" | "DEPUTY" | "ANY"; leaders: string[]; canBreak: boolean; pendingChoiceId: string | null } | null;
  } | null;
  rivals: { id: string; name: string }[];
  allies: { id: string; name: string }[];
  history: { title: string; choiceLabel: string | null }[];
  isCaptain: boolean;
  isAdmin: boolean;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  voteAction: (formData: FormData) => Promise<void>;
  chooseTargetAction: (formData: FormData) => Promise<void>;
  breakTieAction: (formData: FormData) => Promise<void>;
  confirmTieAction: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Story screen — pure view, reused by /demo. */
export function StoryView({
  storyTitle,
  teamName,
  teamColor,
  node,
  unmet,
  choices,
  vote,
  rivals,
  allies,
  history,
  isCaptain,
  isAdmin,
  params,
  demo,
  voteAction,
  chooseTargetAction,
  breakTieAction,
  confirmTieAction,
}: StoryViewProps) {
  if (!node) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1>Histoire</h1>
        <KyleEmpty>{teamName ? "L'histoire n'a pas encore commencé." : "Rejoins une équipe pour vivre l'histoire."}</KyleEmpty>
      </main>
    );
  }

  const tie = vote?.status === "OPEN" ? vote.tie : null;

  return (
    <main className="story flex flex-1 flex-col gap-5 p-5">
      {!demo && <LiveRefresh seconds={20} />}
      <Flash params={params} />
      <header>
        <Eyebrow style={{ color: teamColor }}>
          {storyTitle} · {teamName}
        </Eyebrow>
        <h1>{node.title}</h1>
      </header>

      <p className="chapter card">{node.body}</p>

      {node.isEnding && <p className="text-center text-lg font-extrabold">✨ Fin de votre histoire</p>}

      {!node.isEnding && unmet.length > 0 && (
        <Card className="flex flex-col gap-1 text-sm" style={{ border: "1.5px solid var(--kyle-deep)" }}>
          <p className="font-extrabold">🔒 Pour continuer, votre équipe doit :</p>
          <ul className="list-inside list-disc text-[color:var(--muted)]">
            {unmet.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </Card>
      )}

      {vote?.status === "AWAITING_TARGET" && (
        <Card className="flex flex-col gap-2">
          <p className="font-extrabold">Choix retenu : {vote.resultChoice?.label}</p>
          {isCaptain || isAdmin ? (
            <form action={chooseTargetAction} className="flex flex-col gap-2">
              <input type="hidden" name="voteId" value={vote.id} />
              <label className="field">
                Quelle équipe visez-vous ?
                <select name="targetTeamId" required defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {rivals.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton className="btn small" pendingLabel="Envoi…">Confirmer la cible</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-[color:var(--muted)]">Le·la capitaine doit désigner l&apos;équipe visée.</p>
          )}
        </Card>
      )}

      {tie && vote && (
        <Card className="flex flex-col gap-1.5" style={{ border: "1.5px solid var(--kyle-deep)" }}>
          <p className="font-extrabold">⚖️ Égalité !</p>
          <p className="text-[13px] text-[color:var(--muted)]">
            {tie.stage === "CAPTAIN" && "Le·la capitaine a 5 h pour trancher, puis l'adjoint·e, puis le premier membre qui se manifeste avec l'accord d'un·e admin."}
            {tie.stage === "DEPUTY" && "Le·la capitaine n'a pas tranché : l'adjoint·e a 5 h, puis le premier membre qui se manifeste avec l'accord d'un·e admin."}
            {tie.stage === "ANY" && !tie.pendingChoiceId && "Le premier membre qui se manifeste tranche, avec l'accord d'un·e admin."}
            {tie.pendingChoiceId && ` Un choix attend la confirmation d'un·e admin : « ${choices.find((c) => c.id === tie.pendingChoiceId)?.label ?? "?"} ».`}{" "}
            Les compteurs sont en pause de minuit à 8 h.
          </p>
          {(tie.canBreak || isAdmin) && !tie.pendingChoiceId && (
            <div className="mt-1 flex flex-wrap gap-2">
              {choices
                .filter((c) => tie.leaders.includes(c.id))
                .map((c) => (
                  <form key={c.id} action={breakTieAction}>
                    <input type="hidden" name="voteId" value={vote.id} />
                    <input type="hidden" name="choiceId" value={c.id} />
                    <SubmitButton className="btn small">Trancher : {c.label}</SubmitButton>
                  </form>
                ))}
            </div>
          )}
          {tie.pendingChoiceId && isAdmin && (
            <div className="mt-1 flex gap-2">
              <form action={confirmTieAction}>
                <input type="hidden" name="voteId" value={vote.id} />
                <input type="hidden" name="accept" value="1" />
                <SubmitButton className="btn small">Confirmer</SubmitButton>
              </form>
              <form action={confirmTieAction}>
                <input type="hidden" name="voteId" value={vote.id} />
                <input type="hidden" name="accept" value="0" />
                <SubmitButton className="btn small ghost">Refuser</SubmitButton>
              </form>
            </div>
          )}
        </Card>
      )}

      {vote?.status === "OPEN" && (
        <section className="flex flex-col gap-2.5">
          <div>
            <p className="font-extrabold">Que fait votre équipe ?</p>
            <p className="text-xs text-[color:var(--muted)]">
              Vote ouvert jusqu&apos;au {dateFmt.format(vote.deadline)} · {vote.ballots} vote{vote.ballots > 1 ? "s" : ""} (3 votants minimum)
              {vote.myChoiceId && " · tu as voté, tu peux changer d'avis jusqu'à la clôture"}
            </p>
          </div>
          {choices.map((c) => (
            <form key={c.id} action={voteAction}>
              <input type="hidden" name="voteId" value={vote.id} />
              <input type="hidden" name="choiceId" value={c.id} />
              <SubmitButton disabled={c.locked} className={`choice ${vote.myChoiceId === c.id ? "mine" : ""} ${c.locked ? "locked" : ""}`}>
                <span className="l">
                  {c.locked && "🔒 "}
                  {c.label}
                </span>
                {c.lockReason && <span className="v">{c.lockReason}</span>}
                {c.effects.length > 0 && <span className="e">{c.effects.join(" · ")}</span>}
                {c.votes.length > 0 && <span className="v">Votes : {c.votes.join(", ")}</span>}
              </SubmitButton>
            </form>
          ))}
          {allies.length > 0 && (
            <p className="text-xs text-[color:var(--muted)]">Alliés qui peuvent voter avec vous : {allies.map((a) => a.name).join(", ")}</p>
          )}
        </section>
      )}

      {history.length > 1 && (
        <section>
          <Eyebrow>Votre parcours</Eyebrow>
          <p className="text-[13px] text-[color:var(--muted)]">
            {history.map((h) => `${h.choiceLabel ? `« ${h.choiceLabel} » → ` : ""}${h.title}`).join(" · ")}
          </p>
        </section>
      )}
    </main>
  );
}
