import assert from "node:assert/strict";
import test from "node:test";

import {
  hydrateGamesWithScoreboard,
  liveScoreWindowMs,
  mergeGamesWithScoreboard,
  shouldFetchScoreboard,
} from "../dist/scoreboard.js";

function game(overrides = {}) {
  return {
    id: 1,
    startDate: new Date("2026-09-12T16:00:00.000Z"),
    completed: false,
    homePoints: null,
    homeLineScores: null,
    awayPoints: null,
    awayLineScores: null,
    ...overrides,
  };
}

function scoreboardGame(overrides = {}) {
  return {
    id: 1,
    status: "in_progress",
    period: 3,
    clock: "08:42",
    homeTeam: { points: 17, lineScores: [7, 3, 7] },
    awayTeam: { points: 14, lineScores: [7, 0, 7] },
    ...overrides,
  };
}

test("overlays an in-progress score and live details by game ID", () => {
  const [hydrated] = mergeGamesWithScoreboard([game()], [scoreboardGame()]);

  assert.deepEqual(
    {
      completed: hydrated.completed,
      homePoints: hydrated.homePoints,
      homeLineScores: hydrated.homeLineScores,
      awayPoints: hydrated.awayPoints,
      awayLineScores: hydrated.awayLineScores,
      status: hydrated.status,
      period: hydrated.period,
      clock: hydrated.clock,
    },
    {
      completed: false,
      homePoints: 17,
      homeLineScores: [7, 3, 7],
      awayPoints: 14,
      awayLineScores: [7, 0, 7],
      status: "in_progress",
      period: 3,
      clock: "08:42",
    },
  );
});

test("converts a scoreboard-completed game to final and fills its scores", () => {
  const [hydrated] = mergeGamesWithScoreboard(
    [game({ homePoints: 20, awayPoints: 20 })],
    [
      scoreboardGame({
        status: "completed",
        period: 4,
        clock: "00:00",
        homeTeam: { points: 27, lineScores: [7, 3, 7, 10] },
        awayTeam: { points: 20, lineScores: [7, 3, 7, 3] },
      }),
    ],
  );

  assert.equal(hydrated.completed, true);
  assert.equal(hydrated.status, "completed");
  assert.equal(hydrated.homePoints, 27);
  assert.equal(hydrated.awayPoints, 20);
});

test("marks a scoreboard-completed game final without inventing missing scores", () => {
  const [hydrated] = mergeGamesWithScoreboard(
    [game()],
    [
      scoreboardGame({
        status: "completed",
        homeTeam: { points: null, lineScores: null },
        awayTeam: { points: null, lineScores: null },
      }),
    ],
  );

  assert.equal(hydrated.completed, true);
  assert.equal(hydrated.homePoints, null);
  assert.equal(hydrated.homeLineScores, null);
  assert.equal(hydrated.awayPoints, null);
  assert.equal(hydrated.awayLineScores, null);
});

test("ignores unrelated games and preserves base values for null live fields", () => {
  const original = game({
    homePoints: 10,
    homeLineScores: [3, 7],
    awayPoints: 7,
    awayLineScores: [7, 0],
  });
  const [unrelated] = mergeGamesWithScoreboard([original], [scoreboardGame({ id: 2 })]);
  const [nullable] = mergeGamesWithScoreboard(
    [original],
    [
      scoreboardGame({
        homeTeam: { points: null, lineScores: null },
        awayTeam: { points: null, lineScores: null },
      }),
    ],
  );

  assert.equal(unrelated, original);
  assert.equal(nullable.homePoints, 10);
  assert.deepEqual(nullable.homeLineScores, [3, 7]);
  assert.equal(nullable.awayPoints, 7);
  assert.deepEqual(nullable.awayLineScores, [7, 0]);
});

test("only requests scores inside the eight-hour window for incomplete games", () => {
  const now = new Date("2026-09-12T20:00:00.000Z");

  assert.equal(shouldFetchScoreboard([game()], now), true);
  assert.equal(
    shouldFetchScoreboard([game({ startDate: new Date(now.getTime() + 1) })], now),
    false,
  );
  assert.equal(shouldFetchScoreboard([game({ completed: true })], now), false);
  assert.equal(
    shouldFetchScoreboard(
      [game({ startDate: new Date(now.getTime() - liveScoreWindowMs - 1) })],
      now,
    ),
    false,
  );
});

test("skips the loader outside the live window", async () => {
  let calls = 0;
  const futureGame = game({ startDate: new Date("2026-09-13T16:00:00.000Z") });
  const result = await hydrateGamesWithScoreboard(
    [futureGame],
    () => {
      calls += 1;
      return Promise.resolve([]);
    },
    new Date("2026-09-12T20:00:00.000Z"),
  );

  assert.equal(calls, 0);
  assert.equal(result[0], futureGame);
});

test("returns original games and reports scoreboard failures", async () => {
  const original = game();
  const failure = new Error("scoreboard unavailable");
  let reported;
  const result = await hydrateGamesWithScoreboard(
    [original],
    () => Promise.reject(failure),
    new Date("2026-09-12T20:00:00.000Z"),
    (error) => {
      reported = error;
    },
  );

  assert.equal(result[0], original);
  assert.equal(reported, failure);
});

test("development cache accepts and parses the scoreboard fixture", async () => {
  process.env.NODE_ENV = "development";
  process.env.SEASON = "2026";
  const { getCached } = await import("../dist/cache.js");
  const cached = await getCached("cfb-scoreboard");
  const parsed = JSON.parse(cached);

  assert.equal(parsed[0].status, "in_progress");
  assert.equal(parsed[0].clock, "08:42");
});
