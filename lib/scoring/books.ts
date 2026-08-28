/** Who may edit or delete a reading. Pure, no I/O. */
import { addActiveTime, isVerificationWindow } from "@/lib/time/paris";

export const EDIT_WINDOW_MS = 60 * 60 * 1000;

export type BookRef = { userId: string; createdAt: Date };
export type Actor = { id: string; role: "ADMIN" | "PLAYER"; /** captain of the book owner's team */ isCaptainOfOwner: boolean };

/** When the owner's 1 h edit window closes — paused while the Sunday verification window is open. */
export function editDeadline(book: BookRef): Date {
  return addActiveTime(book.createdAt, EDIT_WINDOW_MS, isVerificationWindow);
}

export function canEditBook(book: BookRef, actor: Actor, now = new Date()): boolean {
  if (actor.role === "ADMIN" || actor.isCaptainOfOwner) return true;
  if (book.userId !== actor.id) return false;
  return now.getTime() <= editDeadline(book).getTime();
}

export const VERIFICATION_MESSAGE =
  "Fenêtre de vérification (dimanche 19 h – 21 h) : ajouts, modifications et suppressions sont suspendus, réessaie après 21 h.";

/** Non-admins cannot write during the Sunday verification window. */
export function assertWritable(role: "ADMIN" | "PLAYER", now = new Date()) {
  if (role !== "ADMIN" && isVerificationWindow(now)) throw new Error(VERIFICATION_MESSAGE);
}
