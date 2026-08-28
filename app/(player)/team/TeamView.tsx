import Link from "next/link";
import { Eyebrow, KyleEmpty, Ledger, MemberRow, Stat } from "@/components/ui";
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
  demo,
  setDeputyAction,
}: TeamViewProps) {
  if (!team) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1>Mon équipe</h1>
        <KyleEmpty>Tu n&apos;as pas encore d&apos;équipe.</KyleEmpty>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <header>
        <Link href={demo ? "/demo" : "/home"} className="text-[13px] text-[color:var(--muted)]">
          ← Accueil
        </Link>
        <h1 style={{ color: team.color }}>{team.name}</h1>
        <p className="text-[13px] text-[color:var(--muted)]">
          {fmtPoints(total)} pts · ⭐ capitaine : {captain ?? "—"} · 🎖️ adjoint·e : {deputy ?? "—"}
        </p>
      </header>
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
          ⚡ {m.label} : points ×{fmtPoints(m.multiplier)} jusqu&apos;au {dateFmt.format(m.endAt)}
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

      <section className="flex flex-col gap-2.5">
        <Eyebrow>Membres</Eyebrow>
        <ul className="list">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              name={m.name}
              color={team.color}
              points={m.points}
              badge={m.isCaptain ? "⭐" : m.isDeputy ? "🎖️" : undefined}
              sub={`${m.books} roman${m.books > 1 ? "s" : ""} · ${m.graphics} graphique${m.graphics > 1 ? "s" : ""} · ${m.pages} pages`}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2.5">
        <Eyebrow>Derniers points</Eyebrow>
        {recent.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Rien pour l&apos;instant.</p>
        ) : (
          <Ledger
            entries={recent.map((e) => ({
              id: e.id,
              amount: e.amount,
              label: (
                <>
                  {e.label}
                  {e.who && <span className="text-[color:var(--muted)]"> · {e.who}</span>}
                </>
              ),
            }))}
          />
        )}
      </section>
    </main>
  );
}
