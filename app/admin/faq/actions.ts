"use server";

import { withFlash } from "@/lib/actions";
import { GameError } from "@/lib/errors";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { deleteQuestion, pinQuestion, resolveQuestion, setupFaq, syncQuestions } from "@/lib/services/questions";

const PATH = "/admin/faq";
const REVALIDATE = ["/admin/faq", "/faq", "/admin"];
const field = (f: FormData, k: string) => String(f.get(k) ?? "");

async function challengeOrThrow() {
  const challenge = await getActiveChallenge();
  if (!challenge) throw new GameError("Aucun défi actif.");
  return challenge;
}

/** Creates (or completes) the forum, the role and the admin role assignments. */
export async function setupFaqAction() {
  await requireAdmin();
  await withFlash(
    PATH,
    async () => {
      const challenge = await challengeOrThrow();
      const r = await setupFaq(challenge.id);
      if (r.problems.length) throw new GameError(`Installation incomplète : ${r.problems.join(" ")}`);
      return `Forum prêt · rôle « Organisateurs » donné à ${r.admins} admin${r.admins > 1 ? "s" : ""}.`;
    },
    REVALIDATE,
  );
}

export async function syncFaqAction() {
  await requireAdmin();
  await withFlash(
    PATH,
    async () => {
      const challenge = await challengeOrThrow();
      const r = await syncQuestions(challenge.id, { force: true });
      const detached = r.detached ? ` ${r.detached} sujet${r.detached > 1 ? "s" : ""} supprimé${r.detached > 1 ? "s" : ""} sur Discord (question${r.detached > 1 ? "s" : ""} conservée${r.detached > 1 ? "s" : ""} sur le site).` : "";
      return `Synchronisation faite : ${r.threads} sujet${r.threads > 1 ? "s" : ""} relu${r.threads > 1 ? "s" : ""}, ${r.imported} message${r.imported > 1 ? "s" : ""} importé${r.imported > 1 ? "s" : ""}.${detached}`;
    },
    REVALIDATE,
  );
}

export async function resolveQuestionAction(formData: FormData) {
  const admin = await requireAdmin();
  const questionId = field(formData, "questionId");
  if (!questionId) return;
  await withFlash(
    PATH,
    async () => {
      const r = await resolveQuestion({ userId: admin.id, questionId });
      return r.alreadyResolved ? "Cette question était déjà résolue." : "Question résolue, sujet Discord archivé.";
    },
    REVALIDATE,
  );
}

export async function pinQuestionAction(formData: FormData) {
  const admin = await requireAdmin();
  const questionId = field(formData, "questionId");
  if (!questionId) return;
  const pinned = field(formData, "pinned") === "1";
  await withFlash(
    PATH,
    async () => {
      await pinQuestion({ userId: admin.id, questionId, pinned });
      return pinned ? "Ajoutée aux questions fréquentes." : "Retirée des questions fréquentes.";
    },
    REVALIDATE,
  );
}

export async function deleteQuestionAction(formData: FormData) {
  const admin = await requireAdmin();
  const questionId = field(formData, "questionId");
  if (!questionId) return;
  await withFlash(
    PATH,
    async () => {
      const r = await deleteQuestion({ userId: admin.id, questionId });
      return r.threadDeleted ? `« ${r.title} » supprimée, sujet Discord inclus.` : `« ${r.title} » supprimée.`;
    },
    REVALIDATE,
  );
}
