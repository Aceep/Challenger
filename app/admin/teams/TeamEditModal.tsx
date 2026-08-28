"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AdminTeamRow } from "./TeamsView";

type Actions = {
  updateTeamAction: (formData: FormData) => Promise<void>;
  deleteTeamAction: (formData: FormData) => Promise<void>;
  setCaptainAction: (formData: FormData) => Promise<void>;
  setDeputyAction: (formData: FormData) => Promise<void>;
};

/** Edit a team in a modal; closing with unsaved changes asks for confirmation. */
export function TeamEditModal({ team, base, updateTeamAction, deleteTeamAction, setCaptainAction, setDeputyAction }: { team: AdminTeamRow; base: string } & Actions) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const initial = useRef<Map<string, string> | null>(null);

  const snapshot = () => {
    const m = new Map<string, string>();
    root.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[name], select[name]").forEach((el) => {
      if (el.type !== "hidden") m.set(`${el.form?.dataset.form}:${el.name}`, el.value);
    });
    return m;
  };
  const isDirty = () => {
    const now = snapshot();
    const before = initial.current ?? snapshot();
    for (const [k, v] of now) if (before.get(k) !== v) return true;
    return false;
  };
  const remember = () => {
    if (!initial.current) initial.current = snapshot();
  };

  return (
    <Modal title={`Modifier · ${team.name}`} onClose={() => router.push(base)} isDirty={isDirty}>
      <div ref={root} onFocusCapture={remember} className="flex flex-col gap-5">
        <form action={updateTeamAction} data-form="team" className="form-grid">
          <input type="hidden" name="teamId" value={team.id} />
          <label className="field">
            Nom
            <input name="name" defaultValue={team.name} required />
          </label>
          <label className="field">
            Couleur
            <input name="color" type="color" defaultValue={team.color} />
          </label>
          <label className="field">
            Salon aventure (id)
            <input name="discordChannelId" defaultValue={team.adventureChannel ?? ""} placeholder="id du salon #aventure" />
          </label>
          <label className="field wide">
            Salon librairie (id)
            <input
              name="discordLibraryChannelId"
              defaultValue={team.libraryChannel ?? ""}
              placeholder="id du salon #librairie"
              style={team.libraryChannel ? undefined : { borderColor: "var(--brick)" }}
            />
            {!team.libraryChannel && (
              <span className="hint" style={{ color: "var(--brick)" }}>
                Sans ce salon, /ajouter-un-livre est refusé pour cette équipe.
              </span>
            )}
          </label>
          <div className="wide">
            <SubmitButton className="btn" pendingLabel="Enregistrement…">
              Enregistrer l&apos;équipe
            </SubmitButton>
          </div>
        </form>

        <div className="grid gap-4 sm:grid-cols-2">
          <form action={setCaptainAction} data-form="captain" className="field">
            <input type="hidden" name="teamId" value={team.id} />
            <span>Capitaine</span>
            <select name="userId" defaultValue={team.captainId}>
              <option value="">— aucun·e —</option>
              {team.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <SubmitButton className="btn small ghost mt-1 self-start">Enregistrer le capitaine</SubmitButton>
          </form>

          <form action={setDeputyAction} data-form="deputy" className="field">
            <input type="hidden" name="teamId" value={team.id} />
            <span>Adjoint·e</span>
            <select name="userId" defaultValue={team.deputyId}>
              <option value="">— aucun·e —</option>
              {team.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="hint">Le·la capitaine peut aussi le·la nommer depuis sa page d&apos;équipe.</span>
            <SubmitButton className="btn small ghost mt-1 self-start">Enregistrer l&apos;adjoint·e</SubmitButton>
          </form>
        </div>

        <form action={deleteTeamAction} className="flex justify-end border-t border-[color:var(--line)] pt-4">
          <input type="hidden" name="teamId" value={team.id} />
          <SubmitButton className="btn small danger">Supprimer l&apos;équipe</SubmitButton>
        </form>
      </div>
    </Modal>
  );
}
