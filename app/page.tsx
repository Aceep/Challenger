import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Landing, type LandingEdition } from "@/components/landing/Landing";
import { prisma } from "@/lib/db";
import { DEMO_ARCHIVE, DEMO_CHALLENGE } from "@/lib/demo/data";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Fallback cards when no edition has been created yet (same content as the mockup). */
const SAMPLE: LandingEdition[] = [
  { id: DEMO_ARCHIVE.id, name: DEMO_ARCHIVE.name, color: DEMO_ARCHIVE.color, period: DEMO_ARCHIVE.period, summary: DEMO_ARCHIVE.summary, status: "FINISHED" },
  {
    id: DEMO_CHALLENGE.id,
    name: DEMO_CHALLENGE.name,
    color: DEMO_CHALLENGE.color,
    period: "5 septembre – 31 octobre 2026",
    summary: "4 équipes · 87 lectures · prochain classement dimanche 20 h",
    status: "ACTIVE",
  },
];

export default async function RootPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  const challenges = await prisma.challenge.findMany({
    where: { status: { in: ["ACTIVE", "FINISHED"] } },
    orderBy: { startAt: "asc" },
    include: { _count: { select: { teams: true } } },
  });

  const editions: LandingEdition[] = challenges.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    period: `${dateFmt.format(c.startAt)} – ${dateFmt.format(c.endAt)}`,
    summary: `${c._count.teams} équipe${c._count.teams > 1 ? "s" : ""}${c.status === "ACTIVE" ? " · prochain classement dimanche 20 h" : ""}`,
    status: c.status,
  }));

  return <Landing editions={editions.length > 0 ? editions : SAMPLE} />;
}
