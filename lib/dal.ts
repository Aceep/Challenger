import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** Session check, deduplicated per request. Redirects to /login when anonymous. */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
});

export const requireAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/home");
  return user;
});

/** Current user with team membership, or null team when unassigned. */
export const getCurrentPlayer = cache(async () => {
  const user = await requireUser();
  const membership = await prisma.teamMember.findUnique({
    where: { userId: user.id },
    include: { team: { include: { challenge: true } } },
  });
  return { user, team: membership?.team ?? null };
});

export const getActiveChallenge = cache(async () => {
  return prisma.challenge.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startAt: "desc" },
  });
});
