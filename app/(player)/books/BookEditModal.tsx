"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import type { ActionState } from "@/lib/forms";
import { BookForm, type BookFormValues } from "./BookForm";

export type BookEditProps = {
  values: BookFormValues;
  title: string;
  quests: { value: string; name: string }[];
  cells: { value: string; name: string }[];
  currentQuest: { value: string; name: string } | null;
  currentCell: { value: string; name: string } | null;
  locked: string | null;
};

/** Edit a reading in a modal (full page on phones); closing with unsaved changes asks first. */
export function BookEditModal({ edit, prefix, action }: { edit: BookEditProps; prefix: string; action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const initial = useRef<Map<string, string> | null>(null);
  const snapshot = () => {
    const m = new Map<string, string>();
    root.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-book-form] input[name], [data-book-form] select[name]").forEach((el) => {
      // Hidden inputs are plumbing (`bookId`) — except the cover, which one may deliberately remove.
      if (el.type !== "hidden" || el.name === "coverUrl") m.set(el.name, el.value);
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
  const close = () => router.push(`${prefix}/books`);
  return (
    <Modal title={edit.title} onClose={close} isDirty={isDirty} width={640}>
      <div ref={root} onFocusCapture={remember}>
        <BookForm
          embedded
          onCancel={close}
          action={action}
          title={edit.title}
          submitLabel="Enregistrer les modifications"
          prefix={prefix}
          quests={edit.quests}
          cells={edit.cells}
          currentQuest={edit.currentQuest}
          currentCell={edit.currentCell}
          locked={edit.locked}
          values={edit.values}
        />
      </div>
    </Modal>
  );
}
