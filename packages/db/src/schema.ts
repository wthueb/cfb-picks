import type { AdapterAccount } from "next-auth/adapters";
import { relations, sql } from "drizzle-orm";
import { index, primaryKey, sqliteTableCreator } from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator((name) => `cfb-picks_${name}`);

export const teamTotalPickTypes = ["TT_OVER", "TT_UNDER"] as const;
export const overUnderPickTypes = ["OVER", "UNDER"] as const;
export const pickTypes = [
  ...teamTotalPickTypes,
  ...overUnderPickTypes,
  "SPREAD",
  "MONEYLINE",
] as const;
export const durations = ["1Q", "1H", "FULL"] as const;

export type TeamTotalPickType = (typeof teamTotalPickTypes)[number];
export type OverUnderPickType = (typeof overUnderPickTypes)[number];
export type PickType = (typeof pickTypes)[number];
export type Duration = (typeof durations)[number];

export function isTeamTotalPickType(pickType: PickType): pickType is TeamTotalPickType {
  return teamTotalPickTypes.includes(pickType as TeamTotalPickType);
}

export type CFBPick = {
  id: number;
  teamId: number;
  season: number;
  week: number;
  gameId: number;
  duration: Duration;
  odds: number;
  double: boolean;
  createdAt: Date;
} & (
  | {
      pickType: OverUnderPickType;
      total: number;
    }
  | {
      pickType: TeamTotalPickType;
      cfbTeamId: number;
      total: number;
    }
  | {
      pickType: "SPREAD";
      cfbTeamId: number;
      spread: number;
    }
  | {
      pickType: "MONEYLINE";
      cfbTeamId: number;
    }
);

export const picks = createTable("pick", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  teamId: d
    .integer({ mode: "number" })
    .notNull()
    .references(() => teams.id),
  season: d.integer({ mode: "number" }).notNull(),
  week: d.integer({ mode: "number" }).notNull(),
  gameId: d.integer({ mode: "number" }).notNull(),
  pickType: d.text({ enum: pickTypes }).notNull(),
  duration: d.text({ enum: durations }).notNull(),
  odds: d.integer({ mode: "number" }).notNull(),
  double: d.integer({ mode: "boolean" }).notNull(),
  total: d.real(),
  spread: d.real(),
  cfbTeamId: d.integer({ mode: "number" }),
  createdAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}));

export const picksRelations = relations(picks, ({ one, many }) => ({
  team: one(teams, { fields: [picks.teamId], references: [teams.id] }),
  notifications: many(pickNotifications),
}));

export const teams = createTable("team", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: d.text({ length: 256 }).notNull(),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  users: many(users),
  picks: many(picks),
}));

export const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  emailVerified: d.integer({ mode: "timestamp" }),
  image: d.text({ length: 255 }),
  teamId: d
    .integer({ mode: "number" })
    .notNull()
    .references(() => teams.id),
  sendNotifications: d.integer({ mode: "boolean" }).notNull().default(false),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  notifications: many(pickNotifications),
}));

export const pickNotifications = createTable("pick_notification", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  pickId: d
    .integer({ mode: "number" })
    .notNull()
    .references(() => picks.id),
  userId: d
    .text({ length: 255 })
    .notNull()
    .references(() => users.id),
  createdAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}));

export const pickNotificationsRelations = relations(pickNotifications, ({ one }) => ({
  pick: one(picks, { fields: [pickNotifications.pickId], references: [picks.id] }),
  user: one(users, { fields: [pickNotifications.userId], references: [users.id] }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.text({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.text({ length: 255 }).notNull(),
    providerAccountId: d.text({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.text({ length: 255 }),
    scope: d.text({ length: 255 }),
    id_token: d.text(),
    session_state: d.text({ length: 255 }),
  }),
  (t) => [
    primaryKey({
      columns: [t.provider, t.providerAccountId],
    }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.text({ length: 255 }).notNull(),
    token: d.text({ length: 255 }).notNull(),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
