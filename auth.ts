import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { syncMemberRoles } from "@/lib/services/discord-setup";
import { consumePendingInvites } from "@/lib/services/membership";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string | null;
      /** Platform owner: organiser of every challenge. Per-challenge roles live in ChallengeMember. */
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }
}

/** How long a JWT keeps its user facts before being refreshed from the database. */
const USER_TTL_MS = 5 * 60_000;

/**
 * Joins every challenge that invited this Discord id, then aligns the Discord
 * roles of each one. Replayed on every sign-in, so an invitation created after
 * the first connection takes effect on the next — `consumePendingInvites` is
 * idempotent.
 */
async function joinInvitedChallenges(userId: string, discordId: string) {
  const challengeIds = await consumePendingInvites(userId, discordId);
  if (challengeIds.length) after(() => Promise.all(challengeIds.map((cid) => syncMemberRoles(userId, cid))));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Discord],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    /**
     * Private platform: only Discord ids pre-registered by an organiser (Invite)
     * or users that already exist may sign in.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "discord" || !account.providerAccountId) return false;
      const discordId = account.providerAccountId;

      if (user.id) {
        const existing = await prisma.user.findUnique({ where: { id: user.id } });
        if (existing) return true;
      }
      const invite = await prisma.invite.findFirst({
        where: { discordId, usedAt: null },
      });
      return invite ? true : "/login?error=NotInvited";
    },
    async jwt({ token, user, account, trigger }) {
      if (user?.id) token.id = user.id;
      if (account?.provider === "discord") token.discordId = account.providerAccountId;
      // Re-read the user facts at most every 5 minutes instead of one database
      // round trip per request. Roles are per challenge and never sit in the
      // token: they are read from ChallengeMember by the request that needs them.
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      const stale = Date.now() - checkedAt > USER_TTL_MS;
      if (stale || trigger === "update" || user || account) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { discordId: true, isSuperAdmin: true },
        });
        token.discordId = dbUser?.discordId ?? token.discordId;
        token.isSuperAdmin = dbUser?.isSuperAdmin ?? false;
        token.checkedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.discordId = (token.discordId as string | undefined) ?? null;
      session.user.isSuperAdmin = token.isSuperAdmin === true;
      return session;
    },
  },
  events: {
    /**
     * First login: link the Discord id, then consume the pending invitations.
     * `linkAccount` (not `createUser`) because Auth.js fires createUser before
     * the Account row exists.
     */
    async linkAccount({ user, account }) {
      if (!user.id || account.provider !== "discord") return;
      const discordId = account.providerAccountId;
      await prisma.user.update({ where: { id: user.id }, data: { discordId } });
      await joinInvitedChallenges(user.id, discordId);
    },
    /** Every login: an invitation to another challenge may have arrived since. */
    async signIn({ user, account }) {
      if (!user.id || account?.provider !== "discord" || !account.providerAccountId) return;
      await joinInvitedChallenges(user.id, account.providerAccountId);
    },
  },
});
