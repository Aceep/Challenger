"use server";

import { withFlash } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/dal";
import { askQuestion, deleteQuestion, pinQuestion, replyToQuestion, resolveQuestion } from "@/lib/services/questions";

const field = (f: FormData, k: string) => String(f.get(k) ?? "");
const paths = (questionId?: string) => ["/faq", "/admin/faq", ...(questionId ? [`/faq/${questionId}`] : [])];

export async function askQuestionAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  await withFlash(
    "/faq",
    async () => {
      const r = await askQuestion({ userId: user.id, title: field(formData, "title"), detail: field(formData, "detail") });
      return r.threadUrl ? "Question publiée : le sujet est ouvert dans le forum Discord." : "Question publiée sur le site.";
    },
    paths(),
  );
}

export async function replyAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const questionId = field(formData, "questionId");
  if (!questionId) return;
  await withFlash(
    `/faq/${questionId}`,
    async () => {
      const r = await replyToQuestion({ userId: user.id, questionId, body: field(formData, "body") });
      return r.isAdmin ? "Réponse publiée — l'auteur·rice est prévenu·e dans le fil." : "Réponse publiée.";
    },
    paths(questionId),
  );
}

export async function resolveAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const questionId = field(formData, "questionId");
  if (!questionId) return;
  await withFlash(
    `/faq/${questionId}`,
    async () => {
      const r = await resolveQuestion({ userId: user.id, questionId });
      return r.alreadyResolved ? "Cette question était déjà résolue." : "Question résolue, sujet Discord archivé.";
    },
    paths(questionId),
  );
}

export async function pinAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const questionId = field(formData, "questionId");
  if (!questionId) return;
  const pinned = field(formData, "pinned") === "1";
  await withFlash(
    `/faq/${questionId}`,
    async () => {
      await pinQuestion({ userId: user.id, questionId, pinned });
      return pinned ? "Ajoutée aux questions fréquentes." : "Retirée des questions fréquentes.";
    },
    paths(questionId),
  );
}

/** Admin only — redirects to the list since the question no longer exists. */
export async function deleteAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const questionId = field(formData, "questionId");
  if (!questionId) return;
  await withFlash(
    "/faq",
    async () => {
      const r = await deleteQuestion({ userId: user.id, questionId });
      return r.threadDeleted ? `« ${r.title} » supprimée, sujet Discord inclus.` : `« ${r.title} » supprimée.`;
    },
    paths(),
  );
}
