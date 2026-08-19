import assert from "node:assert/strict";
import test from "node:test";

import { classifyPickInsights } from "../dist/board.js";

function spread(id, teamId, cfbTeamId, spread) {
  return {
    id,
    teamId,
    season: 2026,
    week: 1,
    gameId: 10,
    duration: "FULL",
    odds: -110,
    double: false,
    createdAt: new Date(),
    pickType: "SPREAD",
    cfbTeamId,
    spread,
  };
}

test("classifies consensus and conflicts within a market", () => {
  const classified = classifyPickInsights([
    { pick: spread(1, 1, 100, -3.5) },
    { pick: spread(2, 2, 100, -3.5) },
    { pick: spread(3, 3, 200, 3.5) },
  ]);

  assert.deepEqual(
    classified.map(({ insight }) => insight),
    ["consensus", "consensus", "conflict"],
  );
});

test("classifies a lone selection as unique", () => {
  const [classified] = classifyPickInsights([{ pick: spread(1, 1, 100, -3.5) }]);
  assert.equal(classified.insight, "unique");
});
