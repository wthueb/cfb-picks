import { and, gte, lt, sql } from "drizzle-orm";

import { db } from "./client.js";
import { picks, teams, users } from "./schema.js";
import { historicalPicks } from "./seed-data.js";

const developmentUsers = [
  {
    id: "development-admin",
    name: "Player 1",
    email: "player1@cfb-picks.test",
    emailVerified: new Date(),
    image: null,
    teamId: 10001,
    sendNotifications: false,
    isAdmin: true,
  },
  {
    id: "development-user",
    name: "Player 2",
    email: "player2@cfb-picks.test",
    emailVerified: new Date(),
    image: null,
    teamId: 10001,
    sendNotifications: false,
    isAdmin: false,
  },
  {
    id: "development-player-3",
    name: "Player 3",
    email: "player3@cfb-picks.test",
    emailVerified: new Date(),
    image: null,
    teamId: 10002,
    sendNotifications: false,
    isAdmin: false,
  },
  {
    id: "development-player-4",
    name: "Player 4",
    email: "player4@cfb-picks.test",
    emailVerified: new Date(),
    image: null,
    teamId: 10002,
    sendNotifications: false,
    isAdmin: false,
  },
  {
    id: "development-player-5",
    name: "Player 5",
    email: "player5@cfb-picks.test",
    emailVerified: new Date(),
    image: null,
    teamId: 10003,
    sendNotifications: false,
    isAdmin: false,
  },
  {
    id: "development-player-6",
    name: "Player 6",
    email: "player6@cfb-picks.test",
    emailVerified: new Date(),
    image: null,
    teamId: 10003,
    sendNotifications: false,
    isAdmin: false,
  },
];

export async function seedDevelopmentDatabase(season: number) {
  await db
    .insert(teams)
    .values([
      { id: 10001, name: "Team A" },
      { id: 10002, name: "Team B" },
      { id: 10003, name: "Team C" },
    ])
    .onConflictDoUpdate({ target: teams.id, set: { name: sql`excluded.name` } });

  await db
    .insert(users)
    .values(developmentUsers)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        emailVerified: sql`excluded.emailVerified`,
        image: sql`excluded.image`,
        teamId: sql`excluded.teamId`,
        sendNotifications: sql`excluded.sendNotifications`,
        isAdmin: sql`excluded.isAdmin`,
      },
    });

  await db.delete(picks).where(and(gte(picks.gameId, 900000000), lt(picks.gameId, 1000000000)));

  const pickValues = historicalPicks.map(
    ([
      id,
      teamId,
      week,
      gameId,
      pickType,
      duration,
      odds,
      double,
      total,
      spread,
      cfbTeamId,
      createdAt,
    ]) => ({
      id,
      teamId,
      season,
      week,
      gameId,
      pickType,
      duration,
      odds,
      double,
      total,
      spread,
      cfbTeamId,
      createdAt: new Date(createdAt * 1000),
    }),
  );

  for (let index = 0; index < pickValues.length; index += 50) {
    await db
      .insert(picks)
      .values(pickValues.slice(index, index + 50))
      .onConflictDoUpdate({
        target: picks.id,
        set: {
          teamId: sql`excluded.teamId`,
          season: sql`excluded.season`,
          week: sql`excluded.week`,
          gameId: sql`excluded.gameId`,
          pickType: sql`excluded.pickType`,
          duration: sql`excluded.duration`,
          odds: sql`excluded.odds`,
          double: sql`excluded.double`,
          total: sql`excluded.total`,
          spread: sql`excluded.spread`,
          cfbTeamId: sql`excluded.cfbTeamId`,
          createdAt: sql`excluded.createdAt`,
        },
      });
  }
}
