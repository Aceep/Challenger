import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { userMessage } from "@/lib/errors";

/**
 * Runs a form-less Server Action and reports the outcome as a flash message
 * (`?ok=` / `?error=`) on `path`, rendered by <Flash />. `path` may already
 * carry a query string (admin filters), the flash is then appended with `&`.
 * `redirect()` must run outside the try/catch because it throws.
 */
export async function withFlash(path: string, fn: () => Promise<string | void>, revalidate?: string[]): Promise<never> {
  const paths = revalidate ?? [path.split("?")[0]];
  const sep = path.includes("?") ? "&" : "?";
  let query: string;
  try {
    const ok = await fn();
    query = ok ? `${sep}ok=${encodeURIComponent(ok)}` : "";
  } catch (e) {
    query = `${sep}error=${encodeURIComponent(userMessage(e))}`;
  }
  for (const p of paths) revalidatePath(p, "layout");
  redirect(`${path}${query}`);
}
