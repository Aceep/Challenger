"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { bookSchema, deleteBook, logBook } from "@/lib/services/books";

export async function logBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(bookSchema, formData);
  if ("error" in parsed) return { error: parsed.error };

  const { points } = await logBook(user.id, parsed.data);
  revalidatePath("/");
  revalidatePath("/books");
  revalidatePath("/leaderboard");
  redirect(`/books?added=${points}`);
}

export async function deleteBookAction(formData: FormData) {
  const user = await requireUser();
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return;
  await deleteBook(user.id, bookId);
  revalidatePath("/");
  revalidatePath("/books");
  revalidatePath("/leaderboard");
}
