"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TrashIcon } from "@/components/ui/icons";

/** Admin « Supprimer » behind a confirmation: removes the question, its answers and the Discord thread. */
export function DeleteQuestionButton({
  questionId,
  title,
  hasThread,
  action,
  iconOnly = false,
}: {
  questionId: string;
  title: string;
  hasThread: boolean;
  action: (formData: FormData) => Promise<void>;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={iconOnly ? "icon-btn" : "btn small ghost"} onClick={() => setOpen(true)} aria-label="Supprimer la question" title="Supprimer">
        {iconOnly ? <TrashIcon /> : "🗑️ Supprimer"}
      </button>
      {open && (
        <Modal title="Supprimer la question" onClose={() => setOpen(false)} width={520}>
          <div className="flex flex-col gap-4">
            <p className="text-[14px]">« {title} »</p>
            <p className="text-[14px] text-[color:var(--muted)]">
              La question et toutes ses réponses disparaîtront du site
              {hasThread ? " et le sujet du forum Discord sera supprimé" : ""}. Cette action est définitive.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <form action={action}>
                <input type="hidden" name="questionId" value={questionId} />
                <SubmitButton className="btn danger" pendingLabel="Suppression…">
                  Oui, supprimer
                </SubmitButton>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
