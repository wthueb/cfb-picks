import assert from "node:assert/strict";
import test from "node:test";

import { isWeeklyDoubleMissingAfterSubmission } from "../dist/picks.js";

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
