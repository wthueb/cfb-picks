import type { DivisionClassification } from "@cfb-picks/cfbd";

type GameClassifications = {
  homeClassification: DivisionClassification | null;
  awayClassification: DivisionClassification | null;
};

export function isGameEligibleForPicks(game: GameClassifications) {
  return game.homeClassification === "fbs" || game.awayClassification === "fbs";
}
