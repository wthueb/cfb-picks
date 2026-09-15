import type { DivisionClassification, Game } from "@cfb-picks/cfbd";

type GameClassifications = {
  homeClassification: DivisionClassification | null;
  awayClassification: DivisionClassification | null;
};

export function isGameEligibleForPicks(game: GameClassifications) {
  return game.homeClassification === "fbs" || game.awayClassification === "fbs";
}

export function formatGamePeriod(period: number | null | undefined) {
  if (!period || period < 1) return null;
  if (period <= 4) return `Q${period}`;

  const overtime = period - 4;
  return overtime === 1 ? "OT" : `${overtime}OT`;
}

export function formatGameScore(
  game: Pick<
    Game,
    | "awayPoints"
    | "awayTeam"
    | "clock"
    | "completed"
    | "homePoints"
    | "homeTeam"
    | "period"
    | "status"
  >,
  options: { includeTeamNames?: boolean } = {},
) {
  const isLive = game.status === "in_progress";
  if (!game.completed && !isLive) return null;

  const period = isLive ? formatGamePeriod(game.period) : null;
  const clock = [period, game.clock ?? null].filter(Boolean).join(" ");
  const liveStatus = ["Live", clock.length > 0 ? clock : null].filter(Boolean).join(" · ");
  const hasScore = game.awayPoints !== null && game.homePoints !== null;

  if (!hasScore) return game.completed ? "Final" : liveStatus;

  const score = options.includeTeamNames
    ? `${game.awayTeam} ${game.awayPoints} - ${game.homePoints} ${game.homeTeam}`
    : `${game.awayPoints}-${game.homePoints}`;

  if (game.completed) return options.includeTeamNames ? score : `Final ${score}`;
  return `${liveStatus} · ${score}`;
}
