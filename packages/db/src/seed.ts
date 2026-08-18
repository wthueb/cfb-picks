import { db } from "./client.js";
import { picks, teams, users } from "./schema.js";

export async function seedDevelopmentDatabase(season: number) {
  await db
    .insert(teams)
    .values([
      { id: 10001, name: "Development Team" },
      { id: 10002, name: "Fixture Friends" },
    ])
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      {
        id: "development-admin",
        name: "Development Admin",
        email: "admin@cfb-picks.test",
        emailVerified: new Date(),
        teamId: 10001,
        sendNotifications: false,
        isAdmin: true,
      },
      {
        id: "development-user",
        name: "Development User",
        email: "user@cfb-picks.test",
        emailVerified: new Date(),
        teamId: 10002,
        sendNotifications: false,
        isAdmin: false,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(picks)
    .values([
      {
        id: 9000001,
        teamId: 10001,
        season,
        week: 1,
        gameId: 900000001,
        pickType: "SPREAD",
        duration: "FULL",
        odds: -110,
        double: false,
        spread: -3.5,
        cfbTeamId: 101,
      },
      {
        id: 9000002,
        teamId: 10001,
        season,
        week: 1,
        gameId: 900000002,
        pickType: "OVER",
        duration: "FULL",
        odds: -105,
        double: true,
        total: 48.5,
      },
      {
        id: 9000003,
        teamId: 10001,
        season,
        week: 2,
        gameId: 900000004,
        pickType: "TT_OVER",
        duration: "1H",
        odds: -115,
        double: false,
        total: 14.5,
        cfbTeamId: 107,
      },
      {
        id: 9000004,
        teamId: 10002,
        season,
        week: 1,
        gameId: 900000003,
        pickType: "UNDER",
        duration: "FULL",
        odds: -110,
        double: false,
        total: 55.5,
      },
    ])
    .onConflictDoNothing();
}
