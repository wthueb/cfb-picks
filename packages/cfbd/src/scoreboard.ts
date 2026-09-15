import type { GetScoreboardResponse } from "cfbd";

import type { Game } from "./index.js";

export const liveScoreWindowMs = 8 * 60 * 60 * 1000;

export function shouldFetchScoreboard(games: Game[], now = new Date()) {
  const nowMs = now.getTime();

  return games.some((game) => {
    const elapsedMs = nowMs - game.startDate.getTime();
    return !game.completed && elapsedMs >= 0 && elapsedMs <= liveScoreWindowMs;
  });
}

export function mergeGamesWithScoreboard(games: Game[], scoreboard: GetScoreboardResponse) {
  const scoreboardById = new Map(scoreboard.map((game) => [game.id, game] as const));

  return games.map((game) => {
    const liveGame = scoreboardById.get(game.id);
    if (!liveGame) return game;

    return {
      ...game,
      completed: game.completed || liveGame.status === "completed",
      homePoints: liveGame.homeTeam.points ?? game.homePoints,
      homeLineScores: liveGame.homeTeam.lineScores ?? game.homeLineScores,
      awayPoints: liveGame.awayTeam.points ?? game.awayPoints,
      awayLineScores: liveGame.awayTeam.lineScores ?? game.awayLineScores,
      status: liveGame.status,
      period: liveGame.period,
      clock: liveGame.clock,
    } satisfies Game;
  });
}

export async function hydrateGamesWithScoreboard(
  games: Game[],
  loadScoreboard: () => Promise<GetScoreboardResponse>,
  now = new Date(),
  onError?: (error: unknown) => void,
) {
  if (!shouldFetchScoreboard(games, now)) return games;

  try {
    return mergeGamesWithScoreboard(games, await loadScoreboard());
  } catch (error) {
    onError?.(error);
    return games;
  }
}
