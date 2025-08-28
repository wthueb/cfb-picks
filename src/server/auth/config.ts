import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, type InferSelectModel } from "drizzle-orm";
import { type DefaultSession, type NextAuthOptions } from "next-auth";
import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { env } from "~/env";
import { db } from "~/server/db";
import { accounts, sessions, teams, users, verificationTokens } from "~/server/db/schema";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: User & DefaultSession["user"];
  }

  interface User extends InferSelectModel<typeof users> {
    id: string;
    teamId: number;
    team: InferSelectModel<typeof teams>;
  }
}

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

type BaseAdapterUser = Exclude<AdapterUser, "team">;

async function populateTeam(user: BaseAdapterUser) {
  if (user.teamId === null) return user;

  const team = await db.select().from(teams).where(eq(teams.id, user.teamId)).get();

  if (!team) throw new Error(`User ${user.id} has invalid teamId ${user.teamId}`);

  return { ...user, team: team };
}

const customAdapter: Adapter = {
  ...baseAdapter,

  async getUser(id) {
    const user = (await baseAdapter.getUser?.(id)) as BaseAdapterUser | null;
    if (!user) return null;

    return await populateTeam(user);
  },

  async getUserByEmail(email) {
    const user = (await baseAdapter.getUserByEmail?.(email)) as BaseAdapterUser | null;
    if (!user) return null;

    return await populateTeam(user);
  },

  async getUserByAccount(account) {
    const user = (await baseAdapter.getUserByAccount?.(account)) as BaseAdapterUser | null;
    if (!user) return null;

    return await populateTeam(user);
  },

  async updateUser(partialUser) {
    const user = (await baseAdapter.updateUser?.(partialUser)) as BaseAdapterUser;
    if (user.teamId === null) return user;

    return await populateTeam(user);
  },

  async deleteUser(userId) {
    const user = (await baseAdapter.deleteUser?.(userId)) as BaseAdapterUser | null;
    if (!user) return null;

    return await populateTeam(user);
  },

  async getSessionAndUser(sessionToken) {
    const res = (await baseAdapter.getSessionAndUser?.(sessionToken)) as {
      session: Exclude<AdapterSession, "user"> & DefaultSession["user"];
      user: BaseAdapterUser;
    } | null;
    if (!res) return null;

    const { session, user } = res;

    return { session, user: await populateTeam(user) };
  },
};

const authConfig: NextAuthOptions = {
  providers: [],
  adapter: customAdapter,
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

    async session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          teamId: user.teamId ?? null,
          team: user.team ?? null,
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
