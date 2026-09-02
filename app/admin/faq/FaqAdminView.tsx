import Link from "next/link";
import { Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { DataTable } from "@/components/ui/DataTable";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusPill, type FaqStatus } from "@/app/(player)/faq/FaqListView";
import { DeleteQuestionButton } from "@/app/(player)/faq/DeleteQuestionButton";

/** What `getFaqSetup` reports about the Discord wiring. */
export type FaqForumInfo = {
  guildId: string | null;
  channelId: string | null;
  roleId: string | null;
  tags: { open: string; answered: string; resolved: string } | null;
  channelUrl: string | null;
  adminsWithDiscord: number;
  lastSyncAt: Date | null;
  inviteUrl: string | null;
};

export type AdminQuestionRow = {
  id: string;
  title: string;
  status: FaqStatus;
  pinned: boolean;
  author: string;
  createdAt: Date;
  messages: number;
  discordUrl: string | null;
  discordDeleted: boolean;
};

export type FaqAdminViewProps = {
  forum: FaqForumInfo;
  questions: AdminQuestionRow[];
  hasChallenge: boolean;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  setupAction: (formData: FormData) => Promise<void>;
  syncAction: (formData: FormData) => Promise<void>;
  resolveAction: (formData: FormData) => Promise<void>;
  pinAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Admin › FAQ — pure view, reused by /demo/admin. */
export function FaqAdminView({ forum, questions, hasChallenge, params, demo, setupAction, syncAction, resolveAction, pinAction, deleteAction }: FaqAdminViewProps) {
  const p = (path: string) => (demo ? `/demo${path}` : path);
  const open = questions.filter((q) => q.status === "OPEN").length;

  return (
    <>
      <div className="topline">
        <h1>FAQ</h1>
        {open > 0 && <Pill tone="wait">{open} sans réponse</Pill>}
        <span className="text-[13.5px] text-[color:var(--muted)]">Chaque question est un sujet du forum Discord ; les réponses circulent dans les deux sens. Un sujet supprimé sur Discord reste ici.</span>
      </div>
      <Flash params={params} />

      {!hasChallenge ? (
        <KyleEmpty>Active un défi pour recevoir des questions.</KyleEmpty>
      ) : (
        <>
          <Card className="flex flex-col gap-3">
            <Eyebrow>Forum Discord</Eyebrow>
            {!forum.guildId ? (
              <p className="text-[14px]">
                Renseigne d&apos;abord l&apos;identifiant du serveur Discord dans{" "}
                <Link href={p("/admin/challenge")} className="underline">
                  Défi
                </Link>
                .
              </p>
            ) : !forum.channelId ? (
              <>
                <p className="text-[14px]">
                  Le bot va créer le salon forum <strong>#faq</strong> avec ses trois étiquettes (🟡 Ouverte, 🔵 Répondue, ✅ Résolue), puis le rôle{" "}
                  <strong>« Organisateurs »</strong> qu&apos;il donnera aux {forum.adminsWithDiscord} admin
                  {forum.adminsWithDiscord > 1 ? "s" : ""} ayant un compte Discord lié.
                </p>
                <p className="text-[13px] text-[color:var(--muted)]">
                  Il lui faut les permissions <strong>Gérer les salons</strong> et <strong>Gérer les rôles</strong>.
                  {forum.inviteUrl && (
                    <>
                      {" "}
                      Si la création échoue,{" "}
                      <a href={forum.inviteUrl} target="_blank" rel="noreferrer" className="underline">
                        ré-invite le bot avec ces permissions ↗
                      </a>{" "}
                      puis recommence.
                    </>
                  )}
                </p>
                <form action={setupAction} className="self-start">
                  <SubmitButton className="btn" pendingLabel="Création…">
                    Créer le forum et le rôle
                  </SubmitButton>
                </form>
              </>
            ) : (
              <>
                <table className="data-table">
                  <tbody>
                    <tr>
                      <td>Salon forum</td>
                      <td className="num">
                        <code>{forum.channelId}</code>{" "}
                        {forum.channelUrl && (
                          <a href={forum.channelUrl} target="_blank" rel="noreferrer" className="underline">
                            ouvrir ↗
                          </a>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Rôle « Organisateurs »</td>
                      <td className="num">{forum.roleId ? <code>{forum.roleId}</code> : <Pill tone="no">manquant</Pill>}</td>
                    </tr>
                    <tr>
                      <td>Étiquettes de statut</td>
                      <td>{forum.tags ? <Pill tone="ok">en place</Pill> : <Pill tone="wait">absentes — les statuts ne seront pas visibles dans Discord</Pill>}</td>
                    </tr>
                    <tr>
                      <td>Admins avec un compte Discord</td>
                      <td className="num">{forum.adminsWithDiscord}</td>
                    </tr>
                    <tr>
                      <td>Dernière synchronisation</td>
                      <td>{forum.lastSyncAt ? dateFmt.format(forum.lastSyncAt) : "jamais"}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={syncAction}>
                    <SubmitButton className="btn small" pendingLabel="Synchro…">
                      Re-synchroniser maintenant
                    </SubmitButton>
                  </form>
                  <form action={setupAction}>
                    <SubmitButton className="btn small ghost" pendingLabel="Vérification…">
                      Vérifier l&apos;installation
                    </SubmitButton>
                  </form>
                  {forum.inviteUrl && (
                    <a href={forum.inviteUrl} target="_blank" rel="noreferrer" className="text-[13px] underline">
                      Ré-inviter le bot ↗
                    </a>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card>
            <Eyebrow>Questions ({questions.length})</Eyebrow>
            {questions.length === 0 ? (
              <p className="text-[13px] text-[color:var(--muted)]">Aucune question pour l&apos;instant.</p>
            ) : (
              <DataTable head={["Statut", "Question", "Auteur·rice", { label: "Réponses", className: "text-right" }, "Posée le", ""]}>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <StatusPill status={q.status} />
                    </td>
                    <td>
                      <Link href={p(`/faq/${q.id}`)} className="underline">
                        {q.pinned ? "📌 " : ""}
                        {q.title}
                      </Link>
                    </td>
                    <td>{q.author}</td>
                    <td className="num text-right">{q.messages}</td>
                    <td className="num">{dateFmt.format(q.createdAt)}</td>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <form action={pinAction} className="inline">
                          <input type="hidden" name="questionId" value={q.id} />
                          <input type="hidden" name="pinned" value={q.pinned ? "0" : "1"} />
                          <SubmitButton className="btn small ghost" pendingLabel="…">
                            {q.pinned ? "Désépingler" : "Épingler"}
                          </SubmitButton>
                        </form>
                        {q.status !== "RESOLVED" && (
                          <form action={resolveAction} className="inline">
                            <input type="hidden" name="questionId" value={q.id} />
                            <SubmitButton className="btn small ghost" pendingLabel="…">
                              Résoudre
                            </SubmitButton>
                          </form>
                        )}
                        {q.discordUrl && (
                          <a href={q.discordUrl} target="_blank" rel="noreferrer" className="text-[13px] underline">
                            Discord ↗
                          </a>
                        )}
                        {q.discordDeleted && <Pill tone="no">sujet Discord supprimé</Pill>}
                        <DeleteQuestionButton questionId={q.id} title={q.title} hasThread={!!q.discordUrl} action={deleteAction} iconOnly />
                      </span>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </>
      )}
    </>
  );
}
