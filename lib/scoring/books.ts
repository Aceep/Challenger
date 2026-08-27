/** Who may edit or delete a logged book. Pure, no I/O. */

export const EDIT_WINDOW_MS = 60 * 60 * 1000;

export type BookRef = { userId: string; createdAt: Date };
export type Actor = { id: string; role: "ADMIN" | "PLAYER"; /** captain of the book owner's team */ isCaptainOfOwner: boolean };

export function canEditBook(book: BookRef, actor: Actor, now = new Date()): boolean {
  if (actor.role === "ADMIN" || actor.isCaptainOfOwner) return true;
  if (book.userId !== actor.id) return false;
  return now.getTime() - book.createdAt.getTime() <= EDIT_WINDOW_MS;
}

/** When the owner's edit window closes. */
export function editDeadline(book: BookRef): Date {
  return new Date(book.createdAt.getTime() + EDIT_WINDOW_MS);
}
