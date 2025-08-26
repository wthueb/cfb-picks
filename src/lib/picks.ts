import type { Game } from "~/server/api/routers/cfb";
import type { CFBPick } from "~/server/api/routers/picks";

export enum PickResult {
  WIN = "WIN",
  LOSS = "LOSS",
  PUSH = "PUSH",
}

export function getPickResult(pick: CFBPick, game: Game): PickResult | null {
  if (!game.completed) return null;
  if (game.id === 401767135 && pick.duration === "FULL") return PickResult.PUSH;

  const homeLineScores = game.homeLineScores ?? [0, 0, 0, 0];
  const awayLineScores = game.awayLineScores ?? [0, 0, 0, 0];

  const homeScore =
    pick.duration === "1Q"
      ? homeLineScores[0]!
      : pick.duration === "1H"
        ? homeLineScores[0]! + homeLineScores[1]!
        : (game.homePoints ?? 0);

  const awayScore =
    pick.duration === "1Q"
      ? awayLineScores[0]!
      : pick.duration === "1H"
        ? awayLineScores[0]! + awayLineScores[1]!
        : (game.awayPoints ?? 0);

  if (pick.pickType === "SPREAD") {
    const teamScore = game.homeId === pick.cfbTeamId ? homeScore : awayScore;
    const opponentScore = game.homeId === pick.cfbTeamId ? awayScore : homeScore;

    if (teamScore + pick.spread === opponentScore) return PickResult.PUSH;
    return teamScore + pick.spread > opponentScore ? PickResult.WIN : PickResult.LOSS;
  }

  if (pick.pickType === "MONEYLINE") {
    const teamScore = game.homeId === pick.cfbTeamId ? homeScore : awayScore;
    const opponentScore = game.homeId === pick.cfbTeamId ? awayScore : homeScore;

    return teamScore > opponentScore ? PickResult.WIN : PickResult.LOSS;
  }

  const total =
    "cfbTeamId" in pick
      ? game.homeId === pick.cfbTeamId
        ? homeScore
        : awayScore
      : homeScore + awayScore;

  if (total === pick.total) return PickResult.PUSH;

  if (pick.pickType.endsWith("OVER")) return total > pick.total ? PickResult.WIN : PickResult.LOSS;
  if (pick.pickType.endsWith("UNDER")) return total < pick.total ? PickResult.WIN : PickResult.LOSS;

  throw new Error("Invalid pick type");
}

function toFractionalOdds(odds: number) {
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds);
}

export function scorePick(pick: CFBPick, game: Game) {
  const result = getPickResult(pick, game);
  if (result === null) return null;

  const double = pick.double ? 2 : 1;

  switch (result) {
    case PickResult.WIN:
      return toFractionalOdds(pick.odds) * double;
    case PickResult.LOSS:
      return -1 * double;
    case PickResult.PUSH:
      return 0;
  }
}

export function getPotential(pick: CFBPick) {
  const double = pick.double ? 2 : 1;
  return toFractionalOdds(pick.odds) * double;
}
