import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { currentMembershipFor, roleIn, teamIn } from "@/lib/services/membership";
import { CHALLENGE_COOKIE } from "@/lib/tenancy/select";

/** Session check, deduplicated per request. Redirects to /login when anonymous. */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
});

/** The challenge the request is about: the `challenge` cookie, when it is one of theirs. */
const preferredChallengeId = cache(async () => (await cookies()).get(CHALLENGE_COOKIE)?.value ?? null);

/**
 * Current user, the challenge they are looking at, their role in it and their
 * team. `challenge` is null for someone who belongs to no edition yet.
 */
export const getCurrentPlayer = cache(async () => {
  const user = await requireUser();
  const membership = await currentMembershipFor(user.id, await preferredChallengeId());
  if (!membership) return { user, challenge: null, role: null, team: null };
  return {
    user,
    challenge: membership.challenge,
    role: membership.role,
    team: await teamIn(user.id, membership.challengeId),
  };
});

export const getCurrentChallenge = cache(async () => (await getCurrentPlayer()).challenge);

/**
 * Organiser check for one challenge (the current one by default). A super-admin
 * passes everywhere; anybody else is sent back to their player home.
 */
export const requireOrganizer = cache(async (challengeId?: string) => {
  const user = await requireUser();
  if (!challengeId) {
    const { challenge, role } = await getCurrentPlayer();
    if (!challenge || role !== "ORGANIZER") redirect("/home");
    return { user, challenge };
  }
  // Named challenge: a super-admin may open an edition they do not belong to.
  if ((await roleIn(user.id, challengeId)) !== "ORGANIZER") redirect("/home");
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) redirect("/home");
  return { user, challenge };
});
