import { Card, KyleEmpty, Meta, PageTitle, Pill, SectionHeading } from "@/components/ui";
import { AlertIcon, ArrowRightIcon, LockIcon, SparkIcon } from "@/components/ui/icons";
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
      <main className="flex flex-1 flex-col gap-5 p-5">
        <PageTitle>Histoire</PageTitle>
        <KyleEmpty>{teamName ? "L’histoire n’a pas encore commencé." : "Rejoins une équipe pour vivre l’histoire."}</KyleEmpty>
      </main>
    );
  }

  const tie = vote?.status === "OPEN" ? vote.tie : null;

  return (
    <main className="story flex flex-1 flex-col gap-5 p-5">
      {!demo && <LiveRefresh seconds={20} />}
      <Flash params={params} />
      <PageTitle
        kicker={
          <p className="accent text-[15px]" style={{ color: teamColor }}>
            {storyTitle} · {teamName}
          </p>
        }
      >
        {node.title}
      </PageTitle>

      <Card className="px-5 py-4.5" data-tour="story-chapter">
        <p className="chapter">{node.body}</p>
      </Card>

      {node.isEnding && (
        <p className="flex items-center justify-center gap-2 text-center text-lg font-bold">
          <SparkIcon />
          Fin de votre histoire
        </p>
      )}

      {!node.isEnding && unmet.length > 0 && (
        <Card tier="raised" className="flex flex-col gap-2" style={{ borderColor: "var(--kyle-deep)" }}>
          <h3 className="flex items-center gap-2">
            <LockIcon />
            Pour continuer, votre équipe doit :
          </h3>
          <ul className="meta list-inside list-disc">
            {unmet.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </Card>
      )}

      {vote?.status === "AWAITING_TARGET" && (
        <Card tier="raised" className="flex flex-col gap-3">
          <h3>Choix retenu : {vote.resultChoice?.label}</h3>
          {isCaptain || isAdmin ? (
            <form action={chooseTargetAction} className="flex flex-col gap-2">
              <input type="hidden" name="voteId" value={vote.id} />
              <label className="field">
                Quelle équipe visez-vous ?
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
              <SubmitButton className="btn sm" pendingLabel="Envoi…">
                Confirmer la cible
              </SubmitButton>
            </form>
          ) : (
            <Meta>Le·la capitaine doit désigner l’équipe visée.</Meta>
          )}
        </Card>
      )}

      {tie && vote && (
        <Card tier="raised" className="flex flex-col gap-2" style={{ borderColor: "var(--kyle-deep)" }}>
          <div className="flex items-center justify-between gap-2.5">
            <h3 className="flex items-center gap-2">
              <AlertIcon />
              Égalité !
            </h3>
            <Pill stamp tone="wait">
              {tie.leaders.length} en tête
            </Pill>
          </div>
          <p className="meta" style={{ color: "var(--ink-2)" }}>
            {tie.stage === "CAPTAIN" && "Le·la capitaine a 5 h pour trancher, puis l’adjoint·e, puis le premier membre qui se manifeste avec l’accord d’un·e admin."}
            {tie.stage === "DEPUTY" && "Le·la capitaine n’a pas tranché : l’adjoint·e a 5 h, puis le premier membre qui se manifeste avec l’accord d’un·e admin."}
            {tie.stage === "ANY" && !tie.pendingChoiceId && "Le premier membre qui se manifeste tranche, avec l’accord d’un·e admin."}
            {tie.pendingChoiceId && ` Un choix attend la confirmation d’un·e admin : « ${choices.find((c) => c.id === tie.pendingChoiceId)?.label ?? "?"} ».`}{" "}
            Les compteurs sont en pause de minuit à 8 h.
          </p>
          {(tie.canBreak || isAdmin) && !tie.pendingChoiceId && (
            <div className="mt-1 flex flex-wrap gap-2">
              {choices
                .filter((c) => tie.leaders.includes(c.id))
                .map((c) => (
                  <form key={c.id} action={breakTieAction}>
                    <input type="hidden" name="voteId" value={vote.id} />
                    <input type="hidden" name="choiceId" value={c.id} />
                    <SubmitButton className="btn sm">Trancher : {c.label}</SubmitButton>
                  </form>
                ))}
            </div>
          )}
          {tie.pendingChoiceId && isAdmin && (
            <div className="mt-1 flex gap-2">
              <form action={confirmTieAction}>
                <input type="hidden" name="voteId" value={vote.id} />
                <input type="hidden" name="accept" value="1" />
                <SubmitButton className="btn sm">Confirmer</SubmitButton>
              </form>
              <form action={confirmTieAction}>
                <input type="hidden" name="voteId" value={vote.id} />
                <input type="hidden" name="accept" value="0" />
                <SubmitButton className="btn sm ghost">Refuser</SubmitButton>
              </form>
            </div>
          )}
        </Card>
      )}

      {vote?.status === "OPEN" && (
        <section className="section">
          <SectionHeading>Que fait votre équipe ?</SectionHeading>
          <Meta>
            Vote ouvert jusqu’au {dateFmt.format(vote.deadline)} · <strong>{vote.ballots} vote{vote.ballots > 1 ? "s" : ""}</strong> (3 votants minimum)
            {vote.myChoiceId && " · tu as voté, tu peux changer d’avis jusqu’à la clôture"}
          </Meta>
          {choices.map((c) => (
            <form key={c.id} action={voteAction}>
              <input type="hidden" name="voteId" value={vote.id} />
              <input type="hidden" name="choiceId" value={c.id} />
              <SubmitButton disabled={c.locked} className={`choice ${vote.myChoiceId === c.id ? "mine" : ""} ${c.locked ? "locked" : ""}`}>
                {vote.myChoiceId === c.id && (
                  <Pill stamp tone="me">
                    Ton vote
                  </Pill>
                )}
                <span className="l">
                  {c.locked && <LockIcon className="ico-sm" />}
                  {c.label}
                </span>
                {c.effects.length > 0 && <span className="e">{c.effects.join(" · ")}</span>}
                {c.lockReason && <span className="v">{c.lockReason}</span>}
                {c.votes.length > 0 && <span className="v">Votes : {c.votes.join(", ")}</span>}
              </SubmitButton>
            </form>
          ))}
          {allies.length > 0 && <Meta xs>Alliés qui peuvent voter avec vous : {allies.map((a) => a.name).join(", ")}</Meta>}
        </section>
      )}

      {history.length > 1 && (
        <section className="section">
          <SectionHeading>Votre parcours</SectionHeading>
          <ol className="path">
            {history.map((h, i) => {
              // `choiceLabel` is the choice that led to a chapter, so it is shown
              // next to the chapter it was made in — the one before.
              const chosen = history[i + 1]?.choiceLabel;
              return (
                <li key={`${h.title}-${i}`}>
                  {h.title}
                  {chosen && <span className="accent">« {chosen} »</span>}
                  {i < history.length - 1 && <ArrowRightIcon className="ico-sm" />}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </main>
  );
}
