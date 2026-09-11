import { Landing, type LandingExample } from "@/components/landing/Landing";
import { botInviteUrl } from "@/lib/discord/permissions";
import { DEMO_ARCHIVE, DEMO_CHALLENGE } from "@/lib/demo/data";

/**
 * Public landing — fully static (no session, no database): signed-in visitors are
 * redirected to /home by proxy.ts. The two cards are made-up communities, there
 * to show what an edition looks like.
 *
 * `AUTH_DISCORD_ID` is read at render, so on a static page it is baked in at
 * build time — never an `after()` here, there is no request to hang it on.
 */
const EXAMPLES: LandingExample[] = [
  {
    id: DEMO_CHALLENGE.id,
    name: DEMO_CHALLENGE.name,
    color: DEMO_CHALLENGE.color,
    period: "5 septembre – 31 octobre 2026",
    summary: "Un club de lecture · 4 équipes · 87 lectures · prochain classement dimanche 20 h",
    status: "ACTIVE",
  },
  {
    id: DEMO_ARCHIVE.id,
    name: DEMO_ARCHIVE.name,
    color: DEMO_ARCHIVE.color,
    period: DEMO_ARCHIVE.period,
    summary: `Un serveur d’ami·es · ${DEMO_ARCHIVE.summary}`,
    status: "FINISHED",
  },
];

export default function RootPage() {
  const appId = process.env.AUTH_DISCORD_ID;
  return <Landing examples={EXAMPLES} installUrl={appId ? botInviteUrl(appId) : null} />;
}
