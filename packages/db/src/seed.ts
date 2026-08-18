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

  const weeklyPicks = Array.from({ length: 8 }, (_, index) => {
    const week = index + 3;
    const firstGameId = 900000000 + week * 2;
    const id = 9100005 + index * 4;

    return [
      {
        id,
        teamId: 10001,
        season,
        week,
        gameId: firstGameId,
        pickType: "SPREAD" as const,
        duration: "FULL" as const,
        odds: -110,
        double: false,
        spread: -3.5,
        cfbTeamId: 101,
      },
      {
        id: id + 1,
        teamId: 10001,
        season,
        week,
        gameId: firstGameId + 1,
        pickType: "OVER" as const,
        duration: "FULL" as const,
        odds: -105,
        double: true,
        total: 48.5,
      },
      {
        id: id + 2,
        teamId: 10002,
        season,
        week,
        gameId: firstGameId,
        pickType: "SPREAD" as const,
        duration: "FULL" as const,
        odds: -110,
        double: false,
        spread: 3.5,
        cfbTeamId: 102,
      },
      {
        id: id + 3,
        teamId: 10002,
        season,
        week,
        gameId: firstGameId + 1,
        pickType: "UNDER" as const,
        duration: "FULL" as const,
        odds: -110,
        double: false,
        total: 48.5,
      },
    ];
  }).flat();

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
      {
        id: 9100001,
        teamId: 10002,
        season,
        week: 1,
        gameId: 900000001,
        pickType: "SPREAD",
        duration: "FULL",
        odds: -110,
        double: false,
        spread: 3.5,
        cfbTeamId: 102,
      },
      {
        id: 9100002,
        teamId: 10001,
        season,
        week: 2,
        gameId: 900000005,
        pickType: "OVER",
        duration: "FULL",
        odds: -105,
        double: true,
        total: 48.5,
      },
      {
        id: 9100003,
        teamId: 10002,
        season,
        week: 2,
        gameId: 900000004,
        pickType: "SPREAD",
        duration: "FULL",
        odds: -110,
        double: false,
        spread: 6.5,
        cfbTeamId: 108,
      },
      {
        id: 9100004,
        teamId: 10002,
        season,
        week: 2,
        gameId: 900000005,
        pickType: "UNDER",
        duration: "FULL",
        odds: -110,
        double: false,
        total: 48.5,
      },
      ...weeklyPicks,
    ])
    .onConflictDoNothing();
}
