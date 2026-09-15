import assert from "node:assert/strict";
import test from "node:test";

import { getPickResult, isWeeklyDoubleMissingAfterSubmission, PickResult } from "../dist/picks.js";

function pick(id, double = false) {
  return { id, double };
}

test("requires the fifth weekly pick to include a double", () => {
  const existingPicks = [pick(1), pick(2), pick(3), pick(4)];

  assert.equal(
    isWeeklyDoubleMissingAfterSubmission(existingPicks, { id: null, double: false }),
    true,
  );
});

test("allows the fifth weekly pick when it is the double", () => {
  const existingPicks = [pick(1), pick(2), pick(3), pick(4)];

  assert.equal(
    isWeeklyDoubleMissingAfterSubmission(existingPicks, { id: null, double: true }),
    false,
  );
});

test("allows the fifth weekly pick when an existing pick is the double", () => {
  const existingPicks = [pick(1, true), pick(2), pick(3), pick(4)];

  assert.equal(
    isWeeklyDoubleMissingAfterSubmission(existingPicks, { id: null, double: false }),
    false,
  );
});

test("allows transferring the double to a new pick", () => {
  const existingPicks = [pick(1, true), pick(2), pick(3)];

  assert.equal(
    isWeeklyDoubleMissingAfterSubmission(existingPicks, { id: null, double: true }),
    false,
  );
});

test("allows fewer than five weekly picks without a double", () => {
  const existingPicks = [pick(1), pick(2), pick(3)];

  assert.equal(
    isWeeklyDoubleMissingAfterSubmission(existingPicks, { id: null, double: false }),
    false,
  );
});

test("allows transferring the double to another pick in a completed week", () => {
  const existingPicks = [pick(1), pick(2), pick(3, true), pick(4), pick(5)];

  assert.equal(isWeeklyDoubleMissingAfterSubmission(existingPicks, { id: 2, double: true }), false);
});

test("prevents editing the only double out of a completed week", () => {
  const existingPicks = [pick(1), pick(2), pick(3, true), pick(4), pick(5)];

  assert.equal(isWeeklyDoubleMissingAfterSubmission(existingPicks, { id: 3, double: false }), true);
});

test("does not score completed picks when required score data is missing", () => {
  const game = {
    id: 1,
    completed: true,
    homePoints: null,
    awayPoints: null,
    homeLineScores: null,
    awayLineScores: null,
  };

  assert.equal(getPickResult({ duration: "FULL" }, game), null);
  assert.equal(getPickResult({ duration: "1Q" }, game), null);
  assert.equal(
    getPickResult({ duration: "1H" }, { ...game, homeLineScores: [7], awayLineScores: [3] }),
    null,
  );
});

test("scores completed picks when required score data is zero", () => {
  assert.equal(
    getPickResult(
      { duration: "FULL", pickType: "UNDER", total: 1 },
      {
        id: 1,
        completed: true,
        homePoints: 0,
        awayPoints: 0,
        homeLineScores: [0],
        awayLineScores: [0],
      },
    ),
    PickResult.Win,
  );
});
