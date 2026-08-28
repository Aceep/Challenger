import { Card, Eyebrow, Pill } from "@/components/ui";
import { DataTable } from "@/components/ui/DataTable";
import type { ActionState } from "@/lib/forms";
import { ChallengeForm, type ChallengeValues } from "./ChallengeForm";

export type ChallengeViewProps = {
  challenge: ChallengeValues | null;
  editions: { id: string; name: string; color: string; period: string; status: "DRAFT" | "ACTIVE" | "FINISHED" }[];
  saveChallengeAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  demo?: boolean;
};

const STATUS: Record<string, { tone: "ok" | "wait" | "type"; label: string }> = {
  ACTIVE: { tone: "ok", label: "actif" },
  DRAFT: { tone: "wait", label: "brouillon" },
  FINISHED: { tone: "type", label: "terminé" },
};

/** Admin › Défi — pure view, reused by /demo/admin. */
export function ChallengeView({ challenge, editions, saveChallengeAction }: ChallengeViewProps) {
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

      <ChallengeForm challenge={challenge} action={saveChallengeAction} />

      <div className="two">
        <Card>
          <Eyebrow>Éditions</Eyebrow>
          <DataTable head={["Édition", "Période", "Statut"]}>
            {editions.map((e) => (
              <tr key={e.id}>
                <td>
                  <span className="dot" style={{ background: e.color }} />
                  {e.name}
                </td>
                <td>{e.period}</td>
                <td>
                  <Pill tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Pill>
                </td>
              </tr>
            ))}
          </DataTable>
          <p className="mt-2.5 text-[13px] text-[color:var(--muted)]">
            Pour ouvrir une nouvelle édition, videz le formulaire ci-dessus (aucun identifiant) et enregistrez : passer une édition en « actif » termine la
            précédente.
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
