"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import type { ActionState } from "@/lib/forms";
import { QuestForm, type QuestFormValues } from "./QuestForm";

type Props = {
  quest?: QuestFormValues;
  nextNumber: number;
  teams: { id: string; name: string }[];
  base: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

/** Create / edit a quest in a modal (full page on phones) with an unsaved-changes guard. */
export function QuestModal({ quest, nextNumber, teams, base, action }: Props) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const initial = useRef<Map<string, string> | null>(null);
  const snapshot = () => {
    const m = new Map<string, string>();
    root.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-quest-form] [name]").forEach((el) => {
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
    <Modal title={quest ? `Modifier la quête #${quest.number}` : "Nouvelle quête"} onClose={close} isDirty={isDirty} width={720}>
      <div ref={root} onFocusCapture={remember}>
        <QuestForm quest={quest} nextNumber={nextNumber} teams={teams} action={action} doneHref={base} onCancel={close} />
      </div>
    </Modal>
  );
}
