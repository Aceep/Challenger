import Link from "next/link";
import { Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusPill, type FaqStatus } from "./FaqListView";
import { ResolveQuestionButton } from "./ResolveQuestionButton";
import { DeleteQuestionButton } from "./DeleteQuestionButton";

export type QuestionMessageRow = {
  id: string;
  author: string;
  isAdmin: boolean;
  /** Typed in the Discord thread and imported by the poll. */
  fromDiscord: boolean;
  body: string;
  createdAt: Date;
};

export type QuestionDetailView = {
  id: string;
  title: string;
  body: string;
  status: FaqStatus;
  pinned: boolean;
  author: string;
  createdAt: Date;
  discordUrl: string | null;
  /** The forum thread was deleted on Discord: the question lives on the site only. */
  discordDeleted: boolean;
  messages: QuestionMessageRow[];
  canReply: boolean;
  /** Author or admin, while the question is not resolved. */
  canResolve: boolean;
  canPin: boolean;
  /** Admin only. */
  canDelete: boolean;
};

export type QuestionViewProps = {
  question: QuestionDetailView;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  replyAction: (formData: FormData) => Promise<void>;
  resolveAction: (formData: FormData) => Promise<void>;
  pinAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** One question and its thread — pure view, reused by /demo. */
export function QuestionView({ question: q, params, demo, replyAction, resolveAction, pinAction, deleteAction }: QuestionViewProps) {
  const base = demo ? "/demo/faq" : "/faq";

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <Flash params={params} />
      {q.discordDeleted && <p className="flash warn">⚠️ Le sujet Discord de cette question a été supprimé : elle ne vit plus que sur le site.</p>}
      <header className="flex flex-col gap-2">
        <Link href={base} className="text-[13px] text-[color:var(--muted)]">
          ← FAQ
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1>{q.title}</h1>
          <StatusPill status={q.status} />
        </div>
        <p className="text-xs text-[color:var(--muted)]">
          Posée par {q.author} · {dateFmt.format(q.createdAt)}
          {q.pinned && " · 📌 en Questions fréquentes"}
        </p>
      </header>

      {q.body && <p className="chapter card">{q.body}</p>}

      <section className="flex flex-col gap-2.5">
        <Eyebrow>
          {q.messages.length} réponse{q.messages.length > 1 ? "s" : ""}
        </Eyebrow>
        {q.messages.length === 0 ? (
          <KyleEmpty>Pas encore de réponse — l&apos;organisation a été prévenue sur Discord.</KyleEmpty>
        ) : (
          <ul className="list">
            {q.messages.map((m) => (
              <li key={m.id}>
                <Card className="flex flex-col gap-1.5">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold">
                    {m.author}
                    {m.isAdmin && <Pill tone="ok">organisation</Pill>}
                    <span className="ml-auto text-xs font-normal text-[color:var(--muted)]">
                      {dateFmt.format(m.createdAt)}
                      {m.fromDiscord && " · Discord"}
                    </span>
                  </p>
                  <p className="whitespace-pre-line text-sm">{m.body}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {q.canReply ? (
        <form action={replyAction} className="flex flex-col gap-2">
          <input type="hidden" name="questionId" value={q.id} />
          <label className="field">
            Répondre
            <textarea name="body" rows={3} required maxLength={1000} placeholder="Ta réponse…" />
            <span className="hint">{q.discordUrl ? "Elle sera publiée ici et dans le sujet Discord." : "Elle sera publiée ici."}</span>
          </label>
          <SubmitButton className="btn" pendingLabel="Envoi…">
            Envoyer la réponse
          </SubmitButton>
        </form>
      ) : (
        <p className="flash ok">✅ Question résolue : le sujet Discord est archivé.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {q.canResolve && <ResolveQuestionButton questionId={q.id} action={resolveAction} />}
        {q.canPin && (
          <form action={pinAction}>
            <input type="hidden" name="questionId" value={q.id} />
            <input type="hidden" name="pinned" value={q.pinned ? "0" : "1"} />
            <SubmitButton className="btn small ghost" pendingLabel="…">
              {q.pinned ? "Retirer des questions fréquentes" : "📌 Épingler en question fréquente"}
            </SubmitButton>
          </form>
        )}
        {q.canDelete && <DeleteQuestionButton questionId={q.id} title={q.title} hasThread={!!q.discordUrl} action={deleteAction} />}
        {q.discordUrl && (
          <a href={q.discordUrl} target="_blank" rel="noreferrer" className="ml-auto text-[13px] underline">
            Voir sur Discord ↗
          </a>
        )}
      </div>
    </main>
  );
}
