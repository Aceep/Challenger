/** Who may edit or delete a reading, and from which edition. Pure, no I/O. */
import { GameError } from "@/lib/errors";
import { addActiveTime, isVerificationWindow } from "@/lib/time/paris";

export const EDIT_WINDOW_MS = 60 * 60 * 1000;

export type BookRef = { userId: string; createdAt: Date };
/** A reading with the edition it was credited to; `team` is null while it belongs to none. */
export type ScopedBook = BookRef & { team: { challengeId: string } | null };
/** Role inside the challenge the action happens in. */
export type ActorRole = "ORGANIZER" | "PLAYER";
export type Actor = {
  id: string;
  role: ActorRole;
  /** captain of the book owner's team */
  isCaptainOfOwner: boolean;
  /** The edition the action happens in; a reading of another one is out of reach. */
  challengeId: string | null;
  /** Platform owner: organiser of every edition, so no edition boundary. */
  isSuperAdmin?: boolean;
};

/** When the owner's 1 h edit window closes — paused while the Sunday verification window is open. */
export function editDeadline(book: BookRef): Date {
  return addActiveTime(book.createdAt, EDIT_WINDOW_MS, isVerificationWindow);
}

/**
 * A reading lives in the edition its team plays: it stays out of reach from any
 * other one, whatever the role held there — organising an edition never grants
 * anything on its neighbour. A reading attached to no team belongs to no
 * edition; the platform owner organises them all.
 */
export function inActorEdition(book: ScopedBook, actor: Pick<Actor, "challengeId" | "isSuperAdmin">): boolean {
  if (!book.team || actor.isSuperAdmin) return true;
  return book.team.challengeId === actor.challengeId;
}

export function canEditBook(book: ScopedBook, actor: Actor, now = new Date()): boolean {
  if (!inActorEdition(book, actor)) return false;
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
