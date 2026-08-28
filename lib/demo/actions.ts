"use server";

import { redirect } from "next/navigation";
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
