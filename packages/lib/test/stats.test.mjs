import assert from "node:assert/strict";
import test from "node:test";

import { aggregateTeamPerformance, rankTeamPerformance } from "../dist/stats.js";

function pick(overrides) {
  return {
    id: 1,
    week: 1,
    pickType: "SPREAD",
    duration: "FULL",
    double: false,
    result: 1,
    resultByWagerAmount: 1,
    startDate: new Date("2026-08-01T16:00:00Z"),
    ...overrides,
  };
}

test("aggregates records, weekly totals, streaks, and breakdowns", () => {
  const performance = aggregateTeamPerformance(
    [
      pick({ id: 1, result: 0.91, resultByWagerAmount: 1 }),
      pick({ id: 2, result: 0, resultByWagerAmount: 0, pickType: "OVER" }),
      pick({
        id: 3,
        week: 2,
        result: -2,
        resultByWagerAmount: -2,
        double: true,
        startDate: new Date("2026-08-08T16:00:00Z"),
      }),
    ],
    2,
  );

  assert.deepEqual(
    {
      total: performance.summary.total,
      wins: performance.summary.wins,
      losses: performance.summary.losses,
      pushes: performance.summary.pushes,
      winRate: performance.summary.winRate,
    },
    { total: 3, wins: 1, losses: 1, pushes: 1, winRate: 0.5 },
  );
  assert.ok(Math.abs(performance.summary.net1u - -1.09) < 1e-10);
  assert.ok(Math.abs(performance.summary.unitsPerPick - -1.09 / 3) < 1e-10);
  assert.deepEqual(performance.summary.currentStreak, { result: "L", count: 1 });
  assert.deepEqual(performance.summary.bestWeek, { week: 1, net1u: 0.91 });
  assert.deepEqual(performance.summary.worstWeek, { week: 2, net1u: -2 });
  assert.ok(Math.abs(performance.weekly[1].cumulative1u - -1.09) < 1e-10);
  assert.deepEqual(
    performance.breakdowns.stake.map(({ key, total }) => ({ key, total })),
    [
      { key: "Double", total: 1 },
      { key: "Regular", total: 2 },
    ],
  );
});

test("ranks by 1u, wager, wins, then name", () => {
  const teams = rankTeamPerformance([
    { name: "Zulu", summary: { net1u: 2, netWager: 1, wins: 3 } },
    { name: "Alpha", summary: { net1u: 2, netWager: 1, wins: 4 } },
    { name: "Bravo", summary: { net1u: 3, netWager: 0, wins: 1 } },
  ]);

  assert.deepEqual(
    teams.map(({ name, rank }) => ({ name, rank })),
    [
      { name: "Bravo", rank: 1 },
      { name: "Alpha", rank: 2 },
      { name: "Zulu", rank: 3 },
    ],
  );
});
