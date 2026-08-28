import Link from "next/link";
import { Button, Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { AskQuestionModal } from "./AskQuestionModal";

export type FaqStatus = "OPEN" | "ANSWERED" | "RESOLVED";

export type FaqQuestionRow = {
  id: string;
  title: string;
  body: string;
  status: FaqStatus;
  pinned: boolean;
  author: string;
  createdAt: Date;
  /** Number of replies, from the site and from Discord. */
  messages: number;
  lastAnswer: { author: string; body: string } | null;
  discordUrl: string | null;
  discordDeleted: boolean;
};

export type FaqListViewProps = {
  questions: FaqQuestionRow[];
  hasChallenge: boolean;
  /** False while the Discord forum is not wired: questions live on the site only. */
  forumConfigured: boolean;
  /** `?new=1` opens the "poser une question" modal. */
  creating: boolean;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  askQuestionAction: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function StatusPill({ status }: { status: FaqStatus }) {
  if (status === "RESOLVED") return <Pill tone="ok">résolue</Pill>;
  if (status === "ANSWERED") return <Pill tone="type">répondue</Pill>;
  return <Pill tone="wait">ouverte</Pill>;
}

function QuestionCard({ q, href }: { q: FaqQuestionRow; href: string }) {
  return (
    <li>
      <Card className="quest">
        <div className="head">
          <p className="n">
            <Link href={href}>{q.title}</Link>
          </p>
          <StatusPill status={q.status} />
        </div>
        <p className="text-xs text-[color:var(--muted)]">
          {q.author} · {dateFmt.format(q.createdAt)} · {q.messages} réponse{q.messages > 1 ? "s" : ""}
        </p>
        {q.lastAnswer && (
          <p className="line-clamp-2 text-sm text-[color:var(--muted)]">
            <strong>{q.lastAnswer.author} :</strong> {q.lastAnswer.body}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-3 text-[13px]">
          <Link href={href} className="underline">
            Voir le fil
          </Link>
          {q.discordUrl && (
            <a href={q.discordUrl} target="_blank" rel="noreferrer" className="text-[color:var(--muted)] underline">
              Sur Discord ↗
            </a>
          )}
        </p>
      </Card>
    </li>
  );
}

/** FAQ list — pure view, reused by /demo. */
export function FaqListView({ questions, hasChallenge, forumConfigured, creating, params, demo, askQuestionAction }: FaqListViewProps) {
  const base = demo ? "/demo/faq" : "/faq";
  const pinned = questions.filter((q) => q.pinned);
  const rest = questions.filter((q) => !q.pinned);

  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <Flash params={params} />
      <header className="flex items-center justify-between gap-3">
        <h1>FAQ</h1>
        {hasChallenge && (
          <Button href={`${base}?new=1`} small>
            + Poser une question
          </Button>
        )}
      </header>

      {!hasChallenge ? (
        <KyleEmpty>Aucun défi actif : les questions rouvriront à la prochaine édition.</KyleEmpty>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <Eyebrow>Questions fréquentes</Eyebrow>
              <ul className="list">
                {pinned.map((q) => (
                  <li key={q.id}>
                    <Card className="quest" style={{ border: "1.5px solid var(--kyle-deep)" }}>
                      <div className="head">
                        <p className="n">{q.title}</p>
                        <StatusPill status={q.status} />
                      </div>
                      {q.lastAnswer ? (
                        <>
                          <p className="whitespace-pre-line text-sm">{q.lastAnswer.body}</p>
                          <p className="text-xs text-[color:var(--muted)]">— {q.lastAnswer.author}</p>
                        </>
                      ) : (
                        <p className="text-sm text-[color:var(--muted)]">Pas encore de réponse de l’organisation.</p>
                      )}
                      <p className="text-[13px]">
                        <Link href={`${base}/${q.id}`} className="underline">
                          Voir le fil
                        </Link>
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-2.5">
            <Eyebrow>Toutes les questions</Eyebrow>
            {rest.length === 0 ? (
              <KyleEmpty>Aucune question pour l’instant — pose la première !</KyleEmpty>
            ) : (
              <ul className="list">
                {rest.map((q) => (
                  <QuestionCard key={q.id} q={q} href={`${base}/${q.id}`} />
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-[color:var(--muted)]">
            {forumConfigured
              ? "Chaque question ouvre un sujet dans le forum #faq de Discord : tout le monde peut y répondre, les réponses remontent ici."
              : "Le forum Discord n’est pas encore relié : les questions restent visibles ici, sur le site."}{" "}
            Sur Discord, la commande <code>/question</code> fait la même chose.
          </p>

          {creating && <AskQuestionModal base={base} forumConfigured={forumConfigured} action={askQuestionAction} />}
        </>
      )}
    </main>
  );
}
