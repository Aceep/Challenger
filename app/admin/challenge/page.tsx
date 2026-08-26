import { prisma } from "@/lib/db";
import { ChallengeForm } from "./ChallengeForm";

export default async function AdminChallengePage() {
  const challenges = await prisma.challenge.findMany({ orderBy: { startAt: "desc" } });
  const current = challenges.find((c) => c.status === "ACTIVE") ?? challenges[0] ?? null;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Défi</h1>
      <ChallengeForm
        challenge={
          current
            ? {
                ...current,
                startAt: current.startAt.toISOString().slice(0, 10),
                endAt: current.endAt.toISOString().slice(0, 10),
              }
            : null
        }
      />
      {challenges.length > 1 && (
        <section className="text-sm text-slate-500">
          Autres éditions : {challenges.filter((c) => c.id !== current?.id).map((c) => c.name).join(", ")}
        </section>
      )}
    </main>
  );
}
