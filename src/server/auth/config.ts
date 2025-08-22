import type { AdapterSession, AdapterUser } from "@auth/core/adapters";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { env } from "~/env";
import { db } from "~/server/db";
import { accounts, sessions, teams, users, verificationTokens } from "~/server/db/schema";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: User & { id: string };
  }

  interface User extends InferSelectModel<typeof users> {
    team: InferSelectModel<typeof teams> | null;
  }
}

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

const customAdapter: typeof baseAdapter = {
  ...baseAdapter,

  async getUser(id): Promise<AdapterUser | null> {
    const res = await db
      .select()
      .from(users)
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(eq(users.id, id))
      .get();

    if (!res) return null;

    return {
      ...res.user,
      team: res.team,
    };
  },

  async getUserByEmail(email): Promise<AdapterUser | null> {
    const res = await db
      .select()
      .from(users)
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(eq(users.email, email))
      .get();

    if (!res) return null;

    return {
      ...res.user,
      team: res.team,
    };
  },

  async getUserByAccount({ provider, providerAccountId }): Promise<AdapterUser | null> {
    const res = await db
      .select()
      .from(accounts)
      .innerJoin(users, eq(accounts.userId, users.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(
        and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)),
      )
      .get();

    if (!res) return null;

    return {
      ...res.user,
      team: res.team,
    };
  },

  async getSessionAndUser(sessionToken): Promise<{
    session: AdapterSession;
    user: AdapterUser;
  } | null> {
    const res = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(eq(sessions.sessionToken, sessionToken))
      .get();

    if (!res) return null;

    return {
      session: res.session,
      user: {
        ...res.user,
        team: res.team,
      },
    };
  },
};

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: customAdapter,
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email ?? ""))
        .get();

      if (!dbUser) {
        console.warn(
          `User with email ${user.email} tried to sign in but does not exist in the db.`,
        );
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
