"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Props = {
  /** List route the modal returns to when closed. */
  base: string;
  forumConfigured: boolean;
  action: (formData: FormData) => Promise<void>;
};

/** « Poser une question » in a modal (full page on phones) with an unsaved-changes guard. */
export function AskQuestionModal({ base, forumConfigured, action }: Props) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const initial = useRef<Map<string, string> | null>(null);

  const snapshot = () => {
    const m = new Map<string, string>();
    root.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[name]").forEach((el) => {
      if (el.type !== "hidden") m.set(el.name, el.value);
    });
    return m;
  };
  const remember = () => {
    if (!initial.current) initial.current = snapshot();
  };
  const isDirty = () => {
    if (!initial.current) return false;
    for (const [k, v] of snapshot()) if (initial.current.get(k) !== v) return true;
    return false;
  };
  const close = () => router.push(base);

  return (
    <Modal title="Poser une question" onClose={close} isDirty={isDirty} width={620}>
      <div ref={root} onFocusCapture={remember}>
        <form action={action} className="flex flex-col gap-4">
          <label className="field">
            Ta question
            <input name="title" required autoFocus maxLength={100} placeholder="ex. Est-ce qu’un manga compte comme une lecture graphique ?" />
            <span className="hint">Une phrase, 100 caractères au maximum. Elle devient le titre du sujet.</span>
          </label>
          <label className="field">
            Détail (facultatif)
            <textarea name="detail" rows={4} maxLength={1000} placeholder="Le contexte, un exemple, ce que tu as déjà essayé…" />
            <span className="hint">1 000 caractères au maximum.</span>
          </label>
          <p className="rounded-[10px] bg-[color:var(--surface-2)] px-3 py-2 text-[13px] text-[color:var(--muted)]">
            {forumConfigured
              ? "Un sujet sera ouvert dans le forum #faq de Discord et l’organisation prévenue. Tout le monde pourra y répondre."
              : "Le forum Discord n’est pas encore relié : ta question restera visible sur le site, l’organisation la verra quand même."}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={close} className="btn ghost">
              Annuler
            </button>
            <SubmitButton className="btn" pendingLabel="Publication…">
              Publier la question
            </SubmitButton>
          </div>
        </form>
      </div>
    </Modal>
  );
}
