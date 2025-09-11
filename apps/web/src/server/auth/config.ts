import type { InferSelectModel } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@cfb-picks/db/client";
import { accounts, sessions, teams, users, verificationTokens } from "@cfb-picks/db/schema";

import { env } from "~/env";

type SessionUser = {
  id: string;
  teamId: number;
  team: InferSelectModel<typeof teams>;
  isAdmin: boolean;
};

declare module "next-auth/adapters" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AdapterUser extends InferSelectModel<typeof users> {}
}

declare module "@auth/core/adapters" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AdapterUser extends InferSelectModel<typeof users> {}
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
    async session({ session, user }) {
      const team = await db.select().from(teams).where(eq(teams.id, user.teamId)).get();
      if (!team) throw new Error(`User ${user.id} has invalid teamId ${user.teamId}`);

      return {
        ...session,
        user: {
          // manually copy over properties so we don't expose anything unwanted
          id: user.id,
          teamId: user.teamId,
          team,
          isAdmin: user.isAdmin,
        },
      };
    },
  },
};

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
