/** Who may edit or delete a reading. Pure, no I/O. */
import { GameError } from "@/lib/errors";
import { addActiveTime, isVerificationWindow } from "@/lib/time/paris";

export const EDIT_WINDOW_MS = 60 * 60 * 1000;

export type BookRef = { userId: string; createdAt: Date };
/** Role inside the challenge the action happens in. */
export type ActorRole = "ORGANIZER" | "PLAYER";
export type Actor = { id: string; role: ActorRole; /** captain of the book owner's team */ isCaptainOfOwner: boolean };

/** When the owner's 1 h edit window closes — paused while the Sunday verification window is open. */
export function editDeadline(book: BookRef): Date {
  return addActiveTime(book.createdAt, EDIT_WINDOW_MS, isVerificationWindow);
}

export function canEditBook(book: BookRef, actor: Actor, now = new Date()): boolean {
  if (actor.role === "ORGANIZER" || actor.isCaptainOfOwner) return true;
  if (book.userId !== actor.id) return false;
  return now.getTime() <= editDeadline(book).getTime();
}

export const VERIFICATION_MESSAGE =
  "Fenêtre de vérification (dimanche 19 h – 21 h) : ajouts, modifications et suppressions sont suspendus, réessaie après 21 h.";

/** Only the organisers may write during the Sunday verification window. */
export function assertWritable(role: ActorRole, now = new Date()) {
  if (role !== "ORGANIZER" && isVerificationWindow(now)) throw new GameError(VERIFICATION_MESSAGE);
}
