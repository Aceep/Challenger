"use client";

import { useActionState, useState } from "react";
import { Pill } from "@/components/ui";
import type { ActionState } from "@/lib/forms";
import { EFFECT_EXAMPLES } from "@/lib/story/effects";

export type EditorChoice = {
  id: string;
  label: string;
  targetNodeId: string | null;
  targetTitle: string | null;
  lockedByQuestId: string | null;
  lockedByQuestTitle: string | null;
  sortOrder: number;
  effects: string;
  effectLabels: string[];
};
export type EditorNode = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  requiredQuestId: string | null;
  requiredBingoLines: number | null;
  requiredPoints: number | null;
  voteHours: number | null;
  defaultChoiceId: string | null;
  teamsHere: number;
  /** Teams stuck here (unmet conditions) and ties waiting to be broken. */
  alerts: { id: string; tone: "wait" | "no"; icon: string; text: string }[];
  choices: EditorChoice[];
};
export type EditorStory = { id: string; title: string; voteHours: number; startNodeId: string | null; nodes: EditorNode[] };

export type StoryActions = {
  saveStoryAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  saveNodeAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  saveChoiceAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  deleteNodeAction: (formData: FormData) => Promise<void>;
  deleteChoiceAction: (formData: FormData) => Promise<void>;
  setStartNodeAction: (formData: FormData) => Promise<void>;
};

export function StoryForm({ story, action }: { story: EditorStory | null; action: StoryActions["saveStoryAction"] }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="card flex flex-wrap items-end gap-3">
      <label className="field min-w-60 flex-1">
        Titre de l&apos;histoire
        <input name="title" required defaultValue={story?.title ?? ""} />
      </label>
      <label className="field">
        Durée d&apos;un vote (heures)
        <input name="voteHours" type="number" min={1} max={720} defaultValue={story?.voteHours ?? 48} />
      </label>
      <button disabled={pending} className="btn">
        {story ? "Mettre à jour" : "Créer l'histoire"}
      </button>
      {state?.error && <p className="flash err w-full">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok w-full">{state.success}</p>}
    </form>
  );
}

export function NodeForm({
  storyId,
  node,
  quests,
  action,
  onDone,
}: {
  storyId: string;
  node?: EditorNode;
  quests: { id: string; title: string }[];
  action: StoryActions["saveNodeAction"];
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="card form-grid" style={{ gridTemplateColumns: "1fr 1fr", border: "1.5px solid var(--kyle-deep)" }}>
      <input type="hidden" name="storyId" value={storyId} />
      {node && <input type="hidden" name="id" value={node.id} />}
      <p className="eyebrow wide">{node ? `Modifier · ${node.title}` : "Nouveau chapitre"}</p>
      <label className="field wide">
        Titre du chapitre
        <input name="title" required defaultValue={node?.title ?? ""} />
      </label>
      <label className="field wide">
        Texte
        <textarea name="body" required rows={5} defaultValue={node?.body ?? ""} />
      </label>
      <label className="field">
        Ordre (tri dans l&apos;éditeur)
        <input name="sortOrder" type="number" defaultValue={node?.sortOrder ?? 0} />
      </label>
      <label className="field">
        Durée du vote (h, vide = défaut)
        <input name="voteHours" type="number" min={1} max={720} defaultValue={node?.voteHours ?? ""} />
      </label>
      <label className="field">
        Condition : quête terminée
        <select name="requiredQuestId" defaultValue={node?.requiredQuestId ?? ""}>
          <option value="">— aucune —</option>
          {quests.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Condition : lignes de bingo
        <input name="requiredBingoLines" type="number" min={0} defaultValue={node?.requiredBingoLines ?? ""} />
      </label>
      <label className="field">
        Condition : points d&apos;équipe
        <input name="requiredPoints" type="number" min={0} defaultValue={node?.requiredPoints ?? ""} />
      </label>
      {node && node.choices.length > 0 && (
        <label className="field">
          Choix par défaut à l&apos;expiration
          <select name="defaultChoiceId" defaultValue={node.defaultChoiceId ?? ""}>
            <option value="">— le premier choix —</option>
            {node.choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {state?.error && <p className="flash err wide">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok wide">{state.success}</p>}
      <div className="wide flex gap-2">
        <button disabled={pending} className="btn">
          {node ? "Enregistrer" : "Créer le chapitre"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="btn ghost">
            Fermer
          </button>
        )}
      </div>
    </form>
  );
}

function ChoiceForm({
  nodeId,
  choice,
  nodes,
  quests,
  action,
  onDone,
}: {
  nodeId: string;
  choice?: EditorChoice;
  nodes: { id: string; title: string }[];
  quests: { id: string; title: string }[];
  action: StoryActions["saveChoiceAction"];
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [showHelp, setShowHelp] = useState(false);
  return (
    <form action={formAction} className="form-grid rounded-xl bg-[color:var(--surface-2)] p-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <input type="hidden" name="nodeId" value={nodeId} />
      {choice && <input type="hidden" name="id" value={choice.id} />}
      <label className="field wide">
        Libellé du choix
        <input name="label" required defaultValue={choice?.label ?? ""} />
      </label>
      <label className="field">
        Mène au chapitre
        <select name="targetNodeId" defaultValue={choice?.targetNodeId ?? ""}>
          <option value="">— fin de l&apos;histoire —</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Verrouillé tant que la quête n&apos;est pas faite
        <select name="lockedByQuestId" defaultValue={choice?.lockedByQuestId ?? ""}>
          <option value="">— toujours disponible —</option>
          {quests.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </label>
      <label className="field wide">
        <span>
          Effets (JSON){" "}
          <button type="button" onClick={() => setShowHelp((v) => !v)} className="font-normal underline">
            {showHelp ? "masquer l'aide" : "exemples"}
          </button>
        </span>
        <textarea name="effects" rows={3} defaultValue={choice?.effects ?? "[]"} className="font-mono text-xs" />
      </label>
      {showHelp && (
        <pre className="wide overflow-x-auto rounded-lg bg-[color:var(--ink)] p-2 text-xs text-[color:var(--bg)]">
          {EFFECT_EXAMPLES}
          {"\n"}target : self (votre équipe) · chosen (équipe choisie par le·la capitaine) · others (toutes les autres)
        </pre>
      )}
      <label className="field">
        Ordre
        <input name="sortOrder" type="number" defaultValue={choice?.sortOrder ?? 0} />
      </label>
      {state?.error && <p className="flash err wide">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok wide">{state.success}</p>}
      <div className="wide flex gap-2">
        <button disabled={pending} className="btn small">
          {choice ? "Mettre à jour" : "Ajouter le choix"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="btn small ghost">
            Fermer
          </button>
        )}
      </div>
    </form>
  );
}

export function NodeList({ story, quests, actions }: { story: EditorStory; quests: { id: string; title: string }[]; actions: StoryActions }) {
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingChoice, setEditingChoice] = useState<string | null>(null);
  const [addingChoiceTo, setAddingChoiceTo] = useState<string | null>(null);
  const [addingNode, setAddingNode] = useState(false);
  const nodeRefs = story.nodes.map((n) => ({ id: n.id, title: n.title }));

  return (
    <div className="flex flex-col gap-3">
      {story.nodes.map((n) =>
        editingNode === n.id ? (
          <NodeForm key={n.id} storyId={story.id} node={n} quests={quests} action={actions.saveNodeAction} onDone={() => setEditingNode(null)} />
        ) : (
          <div key={n.id} className="node" style={n.alerts.length ? { borderColor: "var(--kyle-deep)" } : undefined}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="t">
                {story.startNodeId === n.id && "🚩 "}
                {n.title}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                {n.choices.length} choix
                {n.voteHours ? ` · vote ${n.voteHours} h` : ""}
                {n.requiredBingoLines ? ` · condition : ${n.requiredBingoLines} lignes de bingo` : ""}
                {n.requiredPoints ? ` · condition : ${n.requiredPoints} pts` : ""}
                {n.defaultChoiceId ? ` · défaut : ${n.choices.find((c) => c.id === n.defaultChoiceId)?.label ?? "?"}` : ""}
                {n.teamsHere > 0 && <Pill tone="type">{n.teamsHere} équipe(s) ici</Pill>}
                <button type="button" onClick={() => setEditingNode(n.id)} className="underline">
                  Modifier
                </button>
                {story.startNodeId !== n.id && (
                  <form action={actions.setStartNodeAction}>
                    <input type="hidden" name="storyId" value={story.id} />
                    <input type="hidden" name="nodeId" value={n.id} />
                    <button className="underline">Définir comme début</button>
                  </form>
                )}
                <form action={actions.deleteNodeAction}>
                  <input type="hidden" name="nodeId" value={n.id} />
                  <button className="text-[color:var(--brick)] underline">Supprimer</button>
                </form>
              </span>
            </div>

            {n.choices.map((c) =>
              editingChoice === c.id ? (
                <ChoiceForm
                  key={c.id}
                  nodeId={n.id}
                  choice={c}
                  nodes={nodeRefs}
                  quests={quests}
                  action={actions.saveChoiceAction}
                  onDone={() => setEditingChoice(null)}
                />
              ) : (
                <div key={c.id} className="c" style={c.lockedByQuestId ? { opacity: 0.6 } : undefined}>
                  <span>
                    {c.lockedByQuestId && "🔒 "}
                    {c.label}
                  </span>
                  <span className="fx">
                    {[...c.effectLabels, c.lockedByQuestTitle ? `débloqué par « ${c.lockedByQuestTitle} »` : ""].filter(Boolean).join(" · ")}
                    {" → "}
                    {c.targetTitle ?? <span style={{ color: "var(--brick)" }}>⚠️ impasse : aucun chapitre suivant</span>}
                  </span>
                  <button type="button" onClick={() => setEditingChoice(c.id)} className="text-xs underline">
                    Modifier
                  </button>
                  <form action={actions.deleteChoiceAction}>
                    <input type="hidden" name="choiceId" value={c.id} />
                    <button className="text-xs text-[color:var(--brick)]">✕</button>
                  </form>
                </div>
              ),
            )}

            {n.alerts.map((a) => (
              <div key={a.id} className={`alert ${a.tone === "no" ? "no" : ""}`}>
                <span aria-hidden>{a.icon}</span>
                <span>{a.text}</span>
              </div>
            ))}

            {addingChoiceTo === n.id ? (
              <ChoiceForm nodeId={n.id} nodes={nodeRefs} quests={quests} action={actions.saveChoiceAction} onDone={() => setAddingChoiceTo(null)} />
            ) : (
              <button type="button" onClick={() => setAddingChoiceTo(n.id)} className="self-start text-sm underline">
                + Ajouter un choix
              </button>
            )}
          </div>
        ),
      )}

      {addingNode ? (
        <NodeForm storyId={story.id} quests={quests} action={actions.saveNodeAction} onDone={() => setAddingNode(false)} />
      ) : (
        <button type="button" onClick={() => setAddingNode(true)} className="btn small ghost self-start">
          + Ajouter un chapitre
        </button>
      )}
    </div>
  );
}
