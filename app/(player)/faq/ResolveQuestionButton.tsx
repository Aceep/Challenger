"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";

/** « Marquer résolue » behind a confirmation: resolving archives the Discord thread. */
export function ResolveQuestionButton({ questionId, action }: { questionId: string; action: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn small ghost" onClick={() => setOpen(true)}>
        ✅ Marquer résolue
      </button>
      {open && (
        <Modal title="Marquer la question comme résolue" onClose={() => setOpen(false)} width={520}>
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-[color:var(--muted)]">
              La question passera en « résolue » et le sujet Discord sera archivé puis verrouillé : plus personne ne pourra y répondre.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <form action={action}>
                <input type="hidden" name="questionId" value={questionId} />
                <SubmitButton className="btn" pendingLabel="Clôture…">
                  Oui, c&apos;est résolu
                </SubmitButton>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
