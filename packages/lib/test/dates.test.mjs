import assert from "node:assert/strict";
import test from "node:test";

import { getGameLockDate, isGameLocked } from "../dist/dates.js";

test("Saturday afternoon games lock at noon Eastern", () => {
  const kickoff = new Date("2026-08-22T19:30:00Z");
  const lock = new Date("2026-08-22T16:00:00Z");

  assert.equal(getGameLockDate(kickoff).toISOString(), lock.toISOString());
  assert.equal(isGameLocked(kickoff, new Date("2026-08-22T15:59:59Z")), false);
  assert.equal(isGameLocked(kickoff, lock), true);
});

test("early Saturday and non-Saturday games lock at kickoff", () => {
  const earlySaturday = new Date("2026-08-22T15:00:00Z");
  const sunday = new Date("2026-08-23T17:00:00Z");

  assert.equal(getGameLockDate(earlySaturday).toISOString(), earlySaturday.toISOString());
  assert.equal(getGameLockDate(sunday).toISOString(), sunday.toISOString());
});
