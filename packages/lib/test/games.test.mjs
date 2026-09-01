import assert from "node:assert/strict";
import test from "node:test";

import { isGameEligibleForPicks } from "../dist/games.js";

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
