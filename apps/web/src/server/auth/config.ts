import type { InferSelectModel } from "drizzle-orm";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@cfb-picks/db/client";
import { accounts, sessions, teams, users, verificationTokens } from "@cfb-picks/db/schema";

import { env } from "~/env";

type SessionUser = NonNullable<DefaultSession["user"]> & {
  id: string;
  teamId: number;
  team: InferSelectModel<typeof teams>;
  isAdmin: boolean;
};

declare module "next-auth/adapters" {
  interface AdapterUser {
    teamId: number;
    sendNotifications: boolean;
    isAdmin: boolean;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    teamId: number;
    sendNotifications: boolean;
    isAdmin: boolean;
  }
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

const authConfig: NextAuthOptions = {
  providers: [],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
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

    // if we wanted to have more to maintain but only have one db round trip, we could override
    // all of the adapter methods and populate the team as part of the AdapterUser
    // that's probably not worth the effort for this small of an app with a local db though
    async session({ session, token, user }) {
      const adapterUser = user as typeof user | undefined;
      const sessionToken = token as typeof token | undefined;
      const userId = adapterUser?.id ?? sessionToken?.sub;
      if (!userId) throw new Error("Session has no user ID");

      const dbUser = await db.select().from(users).where(eq(users.id, userId)).get();
      if (!dbUser) throw new Error(`User ${userId} does not exist`);

      const team = await db.select().from(teams).where(eq(teams.id, dbUser.teamId)).get();
      if (!team) throw new Error(`User ${userId} has invalid teamId ${dbUser.teamId}`);

      return {
        ...session,
        user: {
          // manually copy over properties so we don't expose anything unwanted
          id: dbUser.id,
          name: dbUser.name,
          teamId: dbUser.teamId,
          team,
          isAdmin: dbUser.isAdmin,
        },
      };
    },
  },
};

if (env.NODE_ENV === "development") {
  authConfig.session = { strategy: "jwt" };
  authConfig.providers.push(
    CredentialsProvider({
      name: "Development Admin",
      credentials: {},
      authorize: async () =>
        (await db.select().from(users).where(eq(users.id, "development-admin")).get()) ?? null,
    }),
  );
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  authConfig.providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM) {
  authConfig.providers.push(
    EmailProvider({
      server: {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT),
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      },
      from: env.EMAIL_FROM,
    }),
  );
}

export { authConfig };
