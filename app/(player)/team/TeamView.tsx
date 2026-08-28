import { KyleEmpty, Ledger, Meta, MemberRow, PageTitle, SectionHeading, Stat } from "@/components/ui";
import { BoltIcon, RibbonIcon, StarIcon } from "@/components/ui/icons";
import { Flash } from "@/components/Flash";
import { fmtPoints } from "@/lib/format";
import { DeputyForm } from "./DeputyForm";

export type TeamViewProps = {
  team: { name: string; color: string; id: string } | null;
  captain: string | null;
  deputy: string | null;
  total: number;
  bySource: Record<string, number>;
  members: { id: string; name: string; books: number; graphics: number; pages: number; points: number; isCaptain: boolean; isDeputy: boolean }[];
  modifiers: { id: string; label: string; multiplier: number; endAt: Date }[];
  recent: { id: string; label: string; who: string | null; amount: number }[];
  canNameDeputy: boolean;
  currentDeputyId: string;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  setDeputyAction?: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const SOURCE_LABEL: Record<string, string> = { READING: "Lecture", BINGO: "Bingo", QUEST: "Quêtes", STORY: "Histoire", ADMIN: "Ajustements" };

/** Team screen — pure view, reused by /demo. */
export function TeamView({
  team,
  captain,
  deputy,
  total,
  bySource,
  members,
  modifiers,
  recent,
  canNameDeputy,
  currentDeputyId,
  params,
  setDeputyAction,
}: TeamViewProps) {
  if (!team) {
    return (
      <main className="flex flex-1 flex-col gap-5 p-5">
        <PageTitle>Mon équipe</PageTitle>
        <KyleEmpty>Tu n’as pas encore d’équipe.</KyleEmpty>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <PageTitle
        stack
        style={{ color: team.color }}
        action={
          <p className="meta row">
            <span>
              <strong>{fmtPoints(total)} pts</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StarIcon className="ico-sm" />
              capitaine : {captain ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RibbonIcon className="ico-sm" />
              adjoint·e : {deputy ?? "—"}
            </span>
          </p>
        }
      >
        {team.name}
      </PageTitle>
      <Flash params={params} />

      <section className="stat2">
        {Object.entries(SOURCE_LABEL).map(([key, label]) =>
          bySource[key] !== undefined ? (
            <Stat key={key} label={label} value={fmtPoints(bySource[key])} tone={bySource[key] < 0 ? "brick" : undefined} />
          ) : null,
        )}
      </section>

      {modifiers.map((m) => (
        <p key={m.id} className="flash warn">
          <BoltIcon />
          <span>
            {m.label} : points ×{fmtPoints(m.multiplier)} jusqu’au {dateFmt.format(m.endAt)}
          </span>
        </p>
      ))}

      {canNameDeputy && setDeputyAction && (
        <DeputyForm
          teamId={team.id}
          members={members.filter((m) => !m.isCaptain).map((m) => ({ id: m.id, name: m.name }))}
          current={currentDeputyId}
          action={setDeputyAction}
        />
      )}

      <section className="section">
        <SectionHeading>Membres</SectionHeading>
        <ul className="list">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              name={m.name}
              color={team.color}
              points={m.points}
              badge={m.isCaptain ? "capitaine" : m.isDeputy ? "adjoint·e" : undefined}
              badgeIcon={m.isCaptain ? <StarIcon className="ico-sm" /> : m.isDeputy ? <RibbonIcon className="ico-sm" /> : undefined}
              sub={`${m.books} roman${m.books > 1 ? "s" : ""} · ${m.graphics} graphique${m.graphics > 1 ? "s" : ""} · ${m.pages} pages`}
            />
          ))}
        </ul>
      </section>

      <section className="section">
        <SectionHeading>Derniers points</SectionHeading>
        {recent.length === 0 ? (
          <Meta>Rien pour l’instant.</Meta>
        ) : (
          <Ledger
            entries={recent.map((e) => ({
              id: e.id,
              amount: e.amount,
              label: (
                <>
                  {e.label}
                  {e.who && <span className="meta-xs"> · {e.who}</span>}
                </>
              ),
            }))}
          />
        )}
      </section>
    </main>
  );
}
