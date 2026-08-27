"use client";

import { useActionState, useState } from "react";
import { EFFECT_EXAMPLES } from "@/lib/story/effects";
import { deleteChoiceAction, deleteNodeAction, saveChoiceAction, saveNodeAction, saveStoryAction, setStartNodeAction } from "./actions";

export type EditorChoice = { id: string; label: string; targetNodeId: string | null; targetTitle: string | null; lockedByQuestId: string | null; sortOrder: number; effects: string };
export type EditorNode = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  requiredQuestId: string | null;
  requiredBingoLines: number | null;
  requiredPoints: number | null;
  teamsHere: number;
  choices: EditorChoice[];
};
export type EditorStory = { id: string; title: string; voteHours: number; startNodeId: string | null; nodes: EditorNode[] };

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900";
const small = "rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900";

export function StoryForm({ story }: { story: EditorStory | null }) {
  const [state, action, pending] = useActionState(saveStoryAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium">
        Titre de l&apos;histoire
        <input name="title" required defaultValue={story?.title ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Durée d&apos;un vote (heures)
        <input name="voteHours" type="number" min={1} max={720} defaultValue={story?.voteHours ?? 48} className={field} />
      </label>
      <button disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
        {story ? "Mettre à jour" : "Créer l'histoire"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-700">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-green-700">{state.success}</p>}
    </form>
  );
}

export function NodeForm({ storyId, node, quests, onDone }: { storyId: string; node?: EditorNode; quests: { id: string; title: string }[]; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveNodeAction, null);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm sm:grid-cols-3 dark:border-indigo-900 dark:bg-slate-900">
      <input type="hidden" name="storyId" value={storyId} />
      {node && <input type="hidden" name="id" value={node.id} />}
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
        Titre du chapitre
        <input name="title" required defaultValue={node?.title ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Ordre (tri dans l&apos;éditeur)
        <input name="sortOrder" type="number" defaultValue={node?.sortOrder ?? 0} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-3">
        Texte
        <textarea name="body" required rows={8} defaultValue={node?.body ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Condition : quête terminée
        <select name="requiredQuestId" defaultValue={node?.requiredQuestId ?? ""} className={field}>
          <option value="">— aucune —</option>
          {quests.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Condition : lignes de bingo d&apos;équipe
        <input name="requiredBingoLines" type="number" min={0} defaultValue={node?.requiredBingoLines ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Condition : points d&apos;équipe
        <input name="requiredPoints" type="number" min={0} defaultValue={node?.requiredPoints ?? ""} className={field} />
      </label>
      {state?.error && <p className="text-sm text-red-700 sm:col-span-3">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700 sm:col-span-3">{state.success}</p>}
      <div className="flex gap-2 sm:col-span-3">
        <button disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {node ? "Mettre à jour" : "Créer le chapitre"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="px-3 py-2 text-slate-500">
            Fermer
          </button>
        )}
      </div>
    </form>
  );
}

function ChoiceForm({ nodeId, choice, nodes, quests, onDone }: { nodeId: string; choice?: EditorChoice; nodes: { id: string; title: string }[]; quests: { id: string; title: string }[]; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveChoiceAction, null);
  const [showHelp, setShowHelp] = useState(false);
  return (
    <form action={action} className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2 dark:bg-slate-800">
      <input type="hidden" name="nodeId" value={nodeId} />
      {choice && <input type="hidden" name="id" value={choice.id} />}
      <label className="flex flex-col gap-1 font-medium sm:col-span-2">
        Libellé du choix
        <input name="label" required defaultValue={choice?.label ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Mène au chapitre
        <select name="targetNodeId" defaultValue={choice?.targetNodeId ?? ""} className={field}>
          <option value="">— fin de l&apos;histoire —</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Verrouillé tant que la quête n&apos;est pas faite
        <select name="lockedByQuestId" defaultValue={choice?.lockedByQuestId ?? ""} className={field}>
          <option value="">— toujours disponible —</option>
          {quests.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-medium sm:col-span-2">
        <span>
          Effets (JSON){" "}
          <button type="button" onClick={() => setShowHelp((v) => !v)} className="font-normal text-indigo-600 underline">
            {showHelp ? "masquer l'aide" : "exemples"}
          </button>
        </span>
        <textarea name="effects" rows={3} defaultValue={choice?.effects ?? "[]"} className={`${field} font-mono text-xs`} />
      </label>
      {showHelp && (
        <pre className="overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-100 sm:col-span-2">
          {EFFECT_EXAMPLES}
          {"\n"}target : self (votre équipe) · chosen (équipe choisie par le·la capitaine) · others (toutes les autres)
        </pre>
      )}
      <label className="flex items-center gap-2 font-medium">
        Ordre <input name="sortOrder" type="number" defaultValue={choice?.sortOrder ?? 0} className={`${small} w-20`} />
      </label>
      {state?.error && <p className="text-red-700 sm:col-span-2">{state.error}</p>}
      {state?.success && <p className="text-green-700 sm:col-span-2">{state.success}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={pending} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60">
          {choice ? "Mettre à jour" : "Ajouter le choix"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="px-3 py-1.5 text-slate-500">
            Fermer
          </button>
        )}
      </div>
    </form>
  );
}

export function NodeList({ story, quests }: { story: EditorStory; quests: { id: string; title: string }[] }) {
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingChoice, setEditingChoice] = useState<string | null>(null);
  const [addingChoiceTo, setAddingChoiceTo] = useState<string | null>(null);
  const nodeRefs = story.nodes.map((n) => ({ id: n.id, title: n.title }));

  return (
    <ul className="flex flex-col gap-4">
      {story.nodes.map((n) => (
        <li key={n.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          {editingNode === n.id ? (
            <NodeForm storyId={story.id} node={n} quests={quests} onDone={() => setEditingNode(null)} />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {story.startNodeId === n.id && "🚩 "}
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {n.choices.length} choix
                    {n.teamsHere > 0 && ` · ${n.teamsHere} équipe${n.teamsHere > 1 ? "s" : ""} ici`}
                    {n.requiredQuestId && " · condition quête"}
                    {n.requiredBingoLines ? ` · ${n.requiredBingoLines} lignes bingo` : ""}
                    {n.requiredPoints ? ` · ${n.requiredPoints} pts` : ""}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" onClick={() => setEditingNode(n.id)} className="underline">
                    Modifier
                  </button>
                  {story.startNodeId !== n.id && (
                    <form action={setStartNodeAction}>
                      <input type="hidden" name="storyId" value={story.id} />
                      <input type="hidden" name="nodeId" value={n.id} />
                      <button className="underline">Définir comme début</button>
                    </form>
                  )}
                  <form action={deleteNodeAction}>
                    <input type="hidden" name="nodeId" value={n.id} />
                    <button className="text-red-600 underline">Supprimer</button>
                  </form>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
            </>
          )}

          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            {n.choices.map((c) =>
              editingChoice === c.id ? (
                <ChoiceForm key={c.id} nodeId={n.id} choice={c} nodes={nodeRefs} quests={quests} onDone={() => setEditingChoice(null)} />
              ) : (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    → <strong>{c.label}</strong> <span className="text-slate-500">→ {c.targetTitle ?? "fin"}</span>
                    {c.lockedByQuestId && " 🔒"}
                    {c.effects !== "[]" && " ⚡"}
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setEditingChoice(c.id)} className="underline">
                      Modifier
                    </button>
                    <form action={deleteChoiceAction}>
                      <input type="hidden" name="choiceId" value={c.id} />
                      <button className="text-red-600 underline">✕</button>
                    </form>
                  </span>
                </div>
              ),
            )}
            {addingChoiceTo === n.id ? (
              <ChoiceForm nodeId={n.id} nodes={nodeRefs} quests={quests} onDone={() => setAddingChoiceTo(null)} />
            ) : (
              <button type="button" onClick={() => setAddingChoiceTo(n.id)} className="self-start text-sm text-indigo-600 underline">
                + Ajouter un choix
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
