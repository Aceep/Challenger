import Link from "next/link";
import { Card, Eyebrow, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { DiscordSetupState } from "@/lib/discord/permissions";
import { DataTable } from "@/components/ui/DataTable";
import type { ActionState } from "@/lib/forms";
import { allDone, type NextStep } from "@/lib/tenancy/next-steps";
import { ChallengeForm, type ChallengeValues } from "./ChallengeForm";

export type ChallengeViewProps = {
  challenge: ChallengeValues | null;
  editions: { id: string; name: string; color: string; period: string; status: "DRAFT" | "ACTIVE" | "FINISHED" }[];
  /** Setup checklist of a young edition; the card disappears once all done. */
  steps: NextStep[];
  /** Setup state of the Discord server + the ready-made invite link. */
  discord: DiscordSetupState & { inviteUrl: string | null };
  params: Record<string, string | string[] | undefined>;
  saveChallengeAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  setupDiscordAction: (formData: FormData) => Promise<void>;
  /** Opens another edition: writes the cookie, then lands back on the admin desk. */
  switchAction: (formData: FormData) => Promise<void>;
  demo?: boolean;
};

const STATUS: Record<string, { tone: "ok" | "wait" | "type"; label: string }> = {
  ACTIVE: { tone: "ok", label: "actif" },
  DRAFT: { tone: "wait", label: "brouillon" },
  FINISHED: { tone: "type", label: "terminé" },
};

/** Admin › Défi — pure view, reused by /demo/admin. */
export function ChallengeView({ challenge, editions, steps, discord, params, saveChallengeAction, setupDiscordAction, switchAction }: ChallengeViewProps) {
  const step = discord.guildId ? (discord.complete ? 3 : 2) : 1;
  const done = steps.filter((s) => s.done).length;

  return (
    <>
      <div className="topline">
        <h1>Défi</h1>
        {challenge && (
          <>
            <span className="ed" style={{ background: challenge.color }}>
              {challenge.name}
            </span>
            <Pill tone={STATUS[challenge.status].tone}>{STATUS[challenge.status].label}</Pill>
          </>
        )}
      </div>
      <Flash params={params} />

      {!allDone(steps) && (
        <Card data-tour="next-steps" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow className="grow">Prochaines étapes</Eyebrow>
            <Pill tone={done === steps.length ? "ok" : "wait"}>
              {done} / {steps.length}
            </Pill>
          </div>
          <ol className="setup-steps">
            {steps.map((s) => (
              <li key={s.id} className={s.done ? "done" : undefined}>
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="grow">{s.label}</strong>
                  {!s.done && s.href ? (
                    <Link href={s.href} className="btn sm ghost ml-auto">
                      Ouvrir
                    </Link>
                  ) : null}
                </span>
                {s.hint ? <span className="hint">{s.hint}</span> : null}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div data-tour="challenge-form">
        <ChallengeForm challenge={challenge} action={saveChallengeAction} />
      </div>

      <Card id="discord" data-tour="challenge-discord" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow className="grow">Serveur Discord</Eyebrow>
          <Pill tone={discord.adminRoleId ? "ok" : "no"}>Organisateurs {discord.adminRoleId ? "✓" : "—"}</Pill>
          <Pill tone={discord.generalChannelId ? "ok" : "no"}>#général {discord.generalChannelId ? "✓" : "—"}</Pill>
          <Pill tone={discord.teamsTotal > 0 && discord.teamsReady === discord.teamsTotal ? "ok" : "wait"}>
            Équipes {discord.teamsReady} / {discord.teamsTotal}
          </Pill>
        </div>

        <ol className="setup-steps">
          <li className={step > 1 ? "done" : ""}>
            <strong>1. Créez un serveur Discord vide</strong>, puis collez son identifiant dans le champ « Serveur Discord (id) » du formulaire ci-dessus et
            enregistrez — ou créez le défi depuis Discord avec <code>/challenger creer</code>&#8239;: l’identifiant est alors déjà rempli.{" "}
            {discord.guildId ? (
              <>
                Serveur : <code>{discord.guildId}</code>
              </>
            ) : (
              <span style={{ color: "var(--brick)" }}>Identifiant manquant : activez le mode développeur sur Discord, clic droit sur le serveur → « Copier l&apos;identifiant ».</span>
            )}
          </li>
          <li className={step > 1 ? "done" : ""}>
            <strong>2. Invitez le bot</strong> sur ce serveur.{" "}
            {discord.inviteUrl ? (
              <a href={discord.inviteUrl} target="_blank" rel="noreferrer" className="btn small">
                Inviter le bot
              </a>
            ) : (
              <span style={{ color: "var(--brick)" }}>AUTH_DISCORD_ID n&apos;est pas configuré côté serveur.</span>
            )}
            <span className="hint">Laissez les trois permissions cochées : gérer les salons, gérer les rôles, envoyer des messages.</span>
          </li>
          <li className={discord.complete ? "done" : ""}>
            <strong>3. Configurez le serveur</strong> : rôles (Organisateurs + une couleur par équipe), catégorie et salons <code>aventure</code> et{" "}
            <code>librairie</code> privés, <code>#général</code> en lecture seule, commandes slash et message d&apos;accueil épinglé de Kyle.
            <form action={setupDiscordAction} className="mt-2">
              <input type="hidden" name="challengeId" value={challenge?.id ?? ""} />
              <SubmitButton className="btn" pendingLabel="Configuration…" disabled={!discord.guildId || !challenge}>
                Configurer le serveur Discord
              </SubmitButton>
            </form>
            <span className="hint">Relançable à volonté : rien n&apos;est dupliqué, seul ce qui manque est créé.</span>
          </li>
        </ol>
      </Card>

      <div className="two">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow className="grow">Éditions</Eyebrow>
            <Link href="/new" className="btn sm ghost">
              Nouvelle édition
            </Link>
          </div>
          <DataTable head={["Édition", "Période", "Statut", ""]}>
            {editions.map((e) => {
              const current = e.id === challenge?.id;
              return (
                <tr key={e.id} className={current ? "current" : undefined}>
                  <td>
                    <span className="dot" style={{ background: e.color }} />
                    {e.name}
                  </td>
                  <td>{e.period}</td>
                  <td>
                    <Pill tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Pill>
                  </td>
                  <td>
                    {current ? (
                      <Pill tone="ok" xs>
                        en cours
                      </Pill>
                    ) : (
                      <form action={switchAction}>
                        <input type="hidden" name="challengeId" value={e.id} />
                        <input type="hidden" name="returnTo" value="/admin" />
                        <SubmitButton className="btn sm ghost" pendingLabel="Ouverture…">
                          Ouvrir
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
          <p className="mt-2.5 text-[13px] text-[color:var(--muted)]">
            Chaque édition est indépendante&#8239;: ses équipes, ses joueurs, son serveur Discord. Un serveur n’accueille qu’un défi actif à la fois.
          </p>
        </Card>

        <Card>
          <Eyebrow>Planificateur</Eyebrow>
          <p className="text-[13.5px]">
            Vercel (offre Hobby) ne déclenche qu&apos;un cron par jour. Pour une précision à l&apos;heure, un planificateur externe appelle{" "}
            <code>/api/cron/tick?secret=…</code> toutes les heures.
          </p>
          <div className="alert ok mt-2">✅ Le tick est aussi déclenché par l&apos;activité (site et Discord), au plus une fois toutes les 5 minutes.</div>
        </Card>
      </div>
    </>
  );
}
