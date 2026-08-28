"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  title: ReactNode;
  children: ReactNode;
  /** Called when the user confirms closing (or closes with nothing to lose). */
  onClose: () => void;
  /** Return true when the content has unsaved changes: closing then asks for confirmation. */
  isDirty?: () => boolean;
  width?: number;
};

/** Accessible modal (focus trap via <dialog>, Escape, backdrop) with an unsaved-changes guard. */
export function Modal({ title, children, onClose, isDirty, width = 760 }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const requestClose = () => {
    if (isDirty?.()) setConfirming(true);
    else onClose();
  };

  return (
    <dialog
      ref={ref}
      className="modal"
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" onClick={requestClose} className="modal-x" aria-label="Fermer">
          ✕
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {confirming && (
        <div className="modal-confirm" role="alertdialog" aria-labelledby="modal-confirm-title">
          <div className="card flex flex-col gap-3">
            <p id="modal-confirm-title" className="font-extrabold">
              Modifications non enregistrées
            </p>
            <p className="text-[14px] text-[color:var(--muted)]">Si tu fermes maintenant, les changements de ce formulaire seront perdus.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn small ghost" onClick={() => setConfirming(false)} autoFocus>
                Continuer l&apos;édition
              </button>
              <button type="button" className="btn small danger" onClick={onClose}>
                Fermer sans enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
