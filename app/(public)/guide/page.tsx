import type { Metadata } from "next";
import { GuideView } from "@/components/guide/GuideView";
import { botInviteUrl } from "@/lib/discord/permissions";

/**
 * Public step-by-step guide — fully static, like the landing: no session, no
 * database, no Discord call. `AUTH_DISCORD_ID` is read at render (that is, at
 * build time for this page), never in an `after()`: there is no request here to
 * hang a side effect on.
 */
export const metadata: Metadata = {
  title: "Guide de l’organisateur·ice · Challenger",
  description: "Ajouter Kyle à son serveur Discord, ouvrir son défi lecture, inviter ses lecteur·ices : le pas à pas, et le parcours des joueur·euses.",
};

export default function GuidePage() {
  const appId = process.env.AUTH_DISCORD_ID;
  return <GuideView installUrl={appId ? botInviteUrl(appId) : null} />;
}
