import type { Game } from "@cfb-picks/cfbd";
import type { CFBPick } from "@cfb-picks/db/schema";

export const WEEKLY_PICK_LIMIT = 5;

export function isWeeklyDoubleMissingAfterSubmission(
  existingPicks: readonly Pick<CFBPick, "id" | "double">[],
  submission: { id: number | null; double: boolean },
) {
  const otherPicks = existingPicks.filter((pick) => pick.id !== submission.id);

  return (
    otherPicks.length + 1 === WEEKLY_PICK_LIMIT &&
    !submission.double &&
    !otherPicks.some((pick) => pick.double)
  );
}

export enum PickResult {
  Win = "Win",
  Loss = "Loss",
  Push = "Push",
}

function getGameScores(pick: CFBPick, game: Game): [home: number, away: number] | null {
  if (pick.duration === "FULL") {
    return game.homePoints === null || game.awayPoints === null
      ? null
      : [game.homePoints, game.awayPoints];
  }

  const requiredPeriods = pick.duration === "1Q" ? 1 : 2;
  const homeScores = game.homeLineScores?.slice(0, requiredPeriods);
  const awayScores = game.awayLineScores?.slice(0, requiredPeriods);

  if (homeScores?.length !== requiredPeriods || awayScores?.length !== requiredPeriods) return null;

  return [
    homeScores.reduce((total, score) => total + score, 0),
    awayScores.reduce((total, score) => total + score, 0),
  ];
}

export function getPickResult(pick: CFBPick, game: Game): PickResult | null {
  if (!game.completed) return null;
  if (game.id === 401767135 && pick.duration === "FULL") return PickResult.Push;

  const scores = getGameScores(pick, game);
  if (!scores) return null;
  const [homeScore, awayScore] = scores;

  if (pick.pickType === "SPREAD") {
    const teamScore = game.homeId === pick.cfbTeamId ? homeScore : awayScore;
    const opponentScore = game.homeId === pick.cfbTeamId ? awayScore : homeScore;

    if (teamScore + pick.spread === opponentScore) return PickResult.Push;
    return teamScore + pick.spread > opponentScore ? PickResult.Win : PickResult.Loss;
  }

  if (pick.pickType === "MONEYLINE") {
    const teamScore = game.homeId === pick.cfbTeamId ? homeScore : awayScore;
    const opponentScore = game.homeId === pick.cfbTeamId ? awayScore : homeScore;

    return teamScore > opponentScore ? PickResult.Win : PickResult.Loss;
  }

  const total =
    "cfbTeamId" in pick
      ? game.homeId === pick.cfbTeamId
        ? homeScore
        : awayScore
      : homeScore + awayScore;

  if (total === pick.total) return PickResult.Push;

  if (pick.pickType.endsWith("OVER")) return total > pick.total ? PickResult.Win : PickResult.Loss;
  if (pick.pickType.endsWith("UNDER")) return total < pick.total ? PickResult.Win : PickResult.Loss;

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
    case PickResult.Win:
      return toFractionalOdds(pick.odds) * double;
    case PickResult.Loss:
      return -1 * double;
    case PickResult.Push:
      return 0;
  }
}

export function getPotential(pick: CFBPick) {
  const double = pick.double ? 2 : 1;
  return toFractionalOdds(pick.odds) * double;
}

export function scorePickByWagerAmount(pick: CFBPick, game: Game) {
  const result = getPickResult(pick, game);
  if (result === null) return null;

  const double = pick.double ? 2 : 1;

  switch (result) {
    case PickResult.Win:
      return double;
    case PickResult.Loss:
      return pick.odds > 0 ? -1 * double : (pick.odds / 100) * double;
    case PickResult.Push:
      return 0;
  }
}
