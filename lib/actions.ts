import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { userMessage } from "@/lib/errors";

/**
 * Runs a form-less Server Action and reports the outcome as a flash message
 * (`?ok=` / `?error=`) on `path`, rendered by <Flash />. `redirect()` must run
 * outside the try/catch because it throws.
 */
export async function withFlash(path: string, fn: () => Promise<string | void>, revalidate: string[] = [path]): Promise<never> {
  let query: string;
  try {
    const ok = await fn();
    query = ok ? `?ok=${encodeURIComponent(ok)}` : "";
  } catch (e) {
    query = `?error=${encodeURIComponent(userMessage(e))}`;
  }
  for (const p of revalidate) revalidatePath(p, "layout");
  redirect(`${path}${query}`);
}
