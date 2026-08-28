import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";

/** Editing now happens in a modal on the readings list; keep old links working. */
export default async function EditBookPage({ params }: PageProps<"/books/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  redirect(`/books?edit=${encodeURIComponent(id)}`);
}
