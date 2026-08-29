import "server-only";
import { cookies } from "next/headers";
import { CHALLENGE_COOKIE } from "@/lib/tenancy/select";

/**
 * The one place that writes the `challenge` cookie. Switching edition
 * (`switchChallengeAction`) and creating one (`createChallengeAction`) both go
 * through it, so the cookie can never be set with different options depending
 * on the caller.
 */

/** Editions are truly separate: the choice is an explicit act, remembered for a year. */
const YEAR = 365 * 24 * 60 * 60;

export async function setCurrentChallengeCookie(challengeId: string) {
  (await cookies()).set(CHALLENGE_COOKIE, challengeId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR,
  });
}

/** Sign-out: the next person to log in on this browser must not inherit the edition. */
export async function clearCurrentChallengeCookie() {
  (await cookies()).delete(CHALLENGE_COOKIE);
}
