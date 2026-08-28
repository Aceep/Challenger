import { Landing, type LandingEdition } from "@/components/landing/Landing";
import { DEMO_ARCHIVE, DEMO_CHALLENGE } from "@/lib/demo/data";

/**
 * Public landing — fully static (no session, no database): signed-in visitors are
 * redirected to /home by proxy.ts. The edition cards are the showcase content.
 */
const EDITIONS: LandingEdition[] = [
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

export default function RootPage() {
  return <Landing editions={EDITIONS} />;
}
