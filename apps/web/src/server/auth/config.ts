import type { InferSelectModel } from "drizzle-orm";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@cfb-picks/db/client";
import { accounts, sessions, teams, users, verificationTokens } from "@cfb-picks/db/schema";
import { getLogger } from "@cfb-picks/logging";

import { env } from "~/env";

const logger = getLogger("cfb_picks.web.auth");

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
  logger: {
    debug(code, metadata) {
      logger.debug("authentication diagnostic", { auth_code: code, auth_metadata: metadata });
    },
    warn(code) {
      logger.warning("authentication warning", { auth_code: code });
    },
    error(code, metadata) {
      logger.error("authentication error", { auth_code: code, error: metadata });
    },
  },
  callbacks: {
    async signIn({ user }) {
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email ?? ""))
        .get();

      if (!dbUser) {
        logger.warning("authentication sign in denied", {
          email: user.email,
          reason: "user_not_found",
        });
        return false;
      }

      logger.info("authentication sign in accepted", {
        user_id: dbUser.id,
        team_id: dbUser.teamId,
      });
      return true;
    },

    // if we wanted to have more to maintain but only have one db round trip, we could override
    // all of the adapter methods and populate the team as part of the AdapterUser
    // that's probably not worth the effort for this small of an app with a local db though
    async session({ session, token, user }) {
      const adapterUser = user as typeof user | undefined;
      const sessionToken = token as typeof token | undefined;
      const userId = adapterUser?.id ?? sessionToken?.sub;
      if (!userId) {
        logger.error("authentication session user id missing");
        throw new Error("Session has no user ID");
      }

      const dbUser = await db.select().from(users).where(eq(users.id, userId)).get();
      if (!dbUser) {
        logger.error("authentication session user missing", { user_id: userId });
        throw new Error(`User ${userId} does not exist`);
      }

      const team = await db.select().from(teams).where(eq(teams.id, dbUser.teamId)).get();
      if (!team) {
        logger.error("authentication session team missing", {
          user_id: userId,
          team_id: dbUser.teamId,
        });
        throw new Error(`User ${userId} has invalid teamId ${dbUser.teamId}`);
      }

      logger.debug("authentication session resolved", {
        user_id: dbUser.id,
        team_id: dbUser.teamId,
        is_admin: dbUser.isAdmin,
      });

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
