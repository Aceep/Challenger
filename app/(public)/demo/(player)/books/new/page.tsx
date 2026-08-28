import { BookForm } from "@/app/(player)/books/BookForm";
import { demoStateAction } from "@/lib/demo/actions";

export default function DemoNewBookPage() {
  return (
    <BookForm
      action={demoStateAction}
      title="J'ai fini une lecture"
      submitLabel="Enregistrer"
      prefix="/demo"
      quests={[
        { value: "demo-quest-3", name: "#3 — Un roman traduit d'une langue asiatique — 20 pts" },
        { value: "demo-quest-1", name: "#1 — Un livre de moins de 200 pages (½ fait) — 10 pts" },
        { value: "demo-quest-4", name: "#4 — Un livre conseillé par un autre membre — 15 pts" },
      ]}
      cells={[
        { value: "demo-cell-8", name: "D2 — Un recueil de poésie" },
        { value: "demo-cell-6", name: "B2 — Une couverture bleue (½ fait)" },
      ]}
      values={{ title: "", author: "", pages: "", type: "ROMAN", finishedAt: "", questId: "", cellId: "" }}
    />
  );
}
