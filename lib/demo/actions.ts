"use server";

import { redirect } from "next/navigation";
import { DEMO_MEMBER_HITS } from "@/lib/demo/data";
import type { ActionState } from "@/lib/forms";

const MESSAGE = "Mode démo : action simulée.";

/**
 * Stand-in for every write in the demo: nothing is persisted, the page just
 * reloads with a flash message. Bind the path: `demoAction.bind(null, "/demo/bingo")`.
 */
export async function demoAction(path: string): Promise<never> {
  redirect(`${path}?ok=${encodeURIComponent(MESSAGE)}`);
}

/** Same, for forms driven by `useActionState`. */
export async function demoStateAction(): Promise<ActionState> {
  return { success: MESSAGE };
}

/**
 * The member search of Admin › Joueurs, without a Discord server: the fixtures
 * answer as the real search would — « nou » gives Nour.
 */
export async function demoSearchMembersAction(query: string): Promise<{ id: string; label: string; sub?: string }[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return DEMO_MEMBER_HITS.filter((m) => `${m.label} ${m.sub ?? ""}`.toLowerCase().includes(q));
}
