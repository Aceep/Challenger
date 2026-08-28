"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TrashIcon } from "@/components/ui/icons";

type Props = {
  bookId: string;
  title: string;
  points: number;
  hasLinks: boolean;
  action: (formData: FormData) => Promise<void>;
};

/** Trash icon → confirmation modal → soft delete through the Server Action. */
export function DeleteBookButton({ bookId, title, points, hasLinks, action }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn danger" onClick={() => setOpen(true)} title="Supprimer" aria-label={`Supprimer « ${title} »`}>
        <TrashIcon />
      </button>
      {open && (
        <Modal title="Supprimer cette lecture ?" onClose={() => setOpen(false)} width={480}>
          <div className="flex flex-col gap-4">
            <p>
              <strong>{title}</strong> sera retirée de tes lectures.
            </p>
            <ul className="list-inside list-disc text-[14px] text-[color:var(--muted)]">
              <li>{points > 0 ? `Les ${points.toLocaleString("fr-FR")} points qu’elle a rapportés sont retirés à l’équipe.` : "Elle n’avait pas rapporté de points."}</li>
              {hasLinks && <li>La case et/ou la quête qu&apos;elle validait repassent « en attente » (l&apos;autre moitié reste acquise).</li>}
              <li>Un·e capitaine ou un·e admin pourra encore la voir dans l'historique.</li>
            </ul>
            <form action={action} className="flex flex-wrap justify-end gap-2">
              <input type="hidden" name="bookId" value={bookId} />
              <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <SubmitButton className="btn small danger" pendingLabel="Suppression…">
                Supprimer
              </SubmitButton>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
