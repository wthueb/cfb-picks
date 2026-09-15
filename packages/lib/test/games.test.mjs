import assert from "node:assert/strict";
import test from "node:test";

import { formatGamePeriod, formatGameScore, isGameEligibleForPicks } from "../dist/games.js";

test("FCS vs FCS games are not eligible for picks", () => {
  assert.equal(
    isGameEligibleForPicks({ homeClassification: "fcs", awayClassification: "fcs" }),
    false,
  );
});

test("games with at least one FBS team remain eligible for picks", () => {
  assert.equal(
    isGameEligibleForPicks({ homeClassification: "fcs", awayClassification: "fbs" }),
    true,
  );
  assert.equal(
    isGameEligibleForPicks({ homeClassification: "fbs", awayClassification: "fcs" }),
    true,
  );
  assert.equal(
    isGameEligibleForPicks({ homeClassification: "fbs", awayClassification: "fbs" }),
    true,
  );
});

test("formats regulation and overtime periods", () => {
  assert.equal(formatGamePeriod(3), "Q3");
  assert.equal(formatGamePeriod(5), "OT");
  assert.equal(formatGamePeriod(6), "2OT");
  assert.equal(formatGamePeriod(null), null);
});

test("formats live scores with available period and clock details", () => {
  const game = {
    awayPoints: 14,
    awayTeam: "Away",
    clock: "08:42",
    completed: false,
    homePoints: 17,
    homeTeam: "Home",
    period: 3,
    status: "in_progress",
  };

  assert.equal(formatGameScore(game), "Live · Q3 08:42 · 14-17");
  assert.equal(
    formatGameScore(game, { includeTeamNames: true }),
    "Live · Q3 08:42 · Away 14 - 17 Home",
  );
});

test("omits unavailable live details and preserves final score formats", () => {
  assert.equal(
    formatGameScore({
      awayPoints: 7,
      awayTeam: "Away",
      clock: null,
      completed: false,
      homePoints: 10,
      homeTeam: "Home",
      period: null,
      status: "in_progress",
    }),
    "Live · 7-10",
  );
  assert.equal(
    formatGameScore({
      awayPoints: 21,
      awayTeam: "Away",
      clock: null,
      completed: true,
      homePoints: 24,
      homeTeam: "Home",
      period: null,
      status: "completed",
    }),
    "Final 21-24",
  );
  assert.equal(
    formatGameScore(
      {
        awayPoints: 21,
        awayTeam: "Away",
        clock: null,
        completed: true,
        homePoints: 24,
        homeTeam: "Home",
        period: null,
        status: "completed",
      },
      { includeTeamNames: true },
    ),
    "Away 21 - 24 Home",
  );
});
