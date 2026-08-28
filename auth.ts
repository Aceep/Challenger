import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      discordId: string | null;
    } & DefaultSession["user"];
  }
}

/** How long a JWT keeps its role before being refreshed from the database. */
const ROLE_TTL_MS = 5 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Discord],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    /**
     * Private platform: only Discord ids pre-registered by an admin (Invite)
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
      // Re-read role/discordId at most every 5 minutes (admin promotions and
      // invite consumption take effect within that delay, or on re-login),
      // instead of one database round trip per request.
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      const stale = Date.now() - checkedAt > ROLE_TTL_MS;
      if (stale || trigger === "update" || user || account) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, discordId: true },
        });
        token.role = dbUser?.role ?? "PLAYER";
        token.discordId = dbUser?.discordId ?? token.discordId;
        token.checkedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.discordId = (token.discordId as string | undefined) ?? null;
      return session;
    },
  },
  events: {
    /**
     * First login: consume the invite → set discordId, role, team.
     * `linkAccount` (not `createUser`) because Auth.js fires createUser before
     * the Account row exists.
     */
    async linkAccount({ user, account }) {
      if (!user.id || account.provider !== "discord") return;
      const discordId = account.providerAccountId;
      const invite = await prisma.invite.findFirst({ where: { discordId, usedAt: null } });

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { discordId, role: invite?.role ?? "PLAYER" },
        });
        if (invite) {
          await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
          if (invite.teamId) {
            await tx.teamMember.create({ data: { userId: user.id!, teamId: invite.teamId } });
          }
        }
      });
    },
  },
});
