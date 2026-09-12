import type { GetCalendarResponse, GetGamesResponse, GetLinesResponse, UserInfo } from "cfbd";
import AsyncLock from "async-lock";
import { client, getUserInfo as fetchUserInfo, getCalendar, getGames, getLines } from "cfbd";

import { getLogger } from "@cfb-picks/logging";

import { getCachedOrRefresh } from "./cache.js";
import { env } from "./env.js";

export type { DivisionClassification } from "cfbd";

const lock = new AsyncLock();
const logger = getLogger("cfb_picks.cfbd.client");
const requestTimeoutMs = 30 * 1000;
export const gameScheduleCacheTtlSeconds = 60 * 60 * 6;

export type Game = Omit<GetGamesResponse[number], "startDate"> & {
  startDate: Date;
};

if (env.NODE_ENV === "production") {
  if (!env.CFB_API_KEY) throw new Error("CFB_API_KEY is required in production");

  client.setConfig({
    headers: {
      Authorization: `Bearer ${env.CFB_API_KEY}`,
    },
  });
}

function parseGame(game: GetGamesResponse[number]): Game {
  return { ...game, startDate: new Date(game.startDate) };
}

export async function getGamesForYear(year: number) {
  return await lock.acquire("getGamesForYear", async () => {
    const cached = await getCachedOrRefresh(`cfb-games-${year}`, 60 * 5, async () => {
      const startedAt = Date.now();
      logger.info("cfbd games request started", { year });
      const res = await getGames({
        query: { year },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      if (!res.data) {
        logger.error("cfbd games request failed", {
          year,
          duration_ms: Date.now() - startedAt,
          error: res.error,
        });
        throw new Error("Error fetching CFB games");
      }

      logger.info("cfbd games request completed", {
        year,
        duration_ms: Date.now() - startedAt,
        game_count: res.data.length,
      });
      return JSON.stringify(res.data);
    });

    return (JSON.parse(cached) as GetGamesResponse).map(parseGame);
  });
}

export async function getGameScheduleForYear(year: number) {
  if (env.NODE_ENV === "development") return await getGamesForYear(year);

  return await lock.acquire("getGameScheduleForYear", async () => {
    const cached = await getCachedOrRefresh(
      `cfb-game-schedule-${year}`,
      gameScheduleCacheTtlSeconds,
      async () => JSON.stringify(await getGamesForYear(year)),
    );

    return (JSON.parse(cached) as GetGamesResponse).map(parseGame);
  });
}

export async function getGameById(id: number) {
  const res = await getGamesForYear(env.SEASON);

  const game = res.find((g) => g.id === id);
  if (!game) {
    logger.warning("cfbd game not found", { game_id: id, season: env.SEASON });
    return null;
  }

  return game;
}

export async function getLinesForYear(year: number) {
  return await lock.acquire("getLinesForYear", async () => {
    const cached = await getCachedOrRefresh(`cfb-lines-${year}`, 60 * 30, async () => {
      const startedAt = Date.now();
      logger.info("cfbd lines request started", { year });
      const res = await getLines({
        query: { year },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      if (!res.data) {
        logger.error("cfbd lines request failed", {
          year,
          duration_ms: Date.now() - startedAt,
          error: res.error,
        });
        throw new Error("Error fetching CFB lines");
      }

      logger.info("cfbd lines request completed", {
        year,
        duration_ms: Date.now() - startedAt,
        line_count: res.data.length,
      });
      return JSON.stringify(res.data);
    });

    return JSON.parse(cached) as GetLinesResponse;
  });
}

export async function getCalendarForYear(year: number) {
  return await lock.acquire("getCalendarForYear", async () => {
    const cached = await getCachedOrRefresh(`cfb-calendar-${year}`, 60 * 60 * 6, async () => {
      const startedAt = Date.now();
      logger.info("cfbd calendar request started", { year });
      const res = await getCalendar({
        query: { year },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      if (!res.data) {
        logger.error("cfbd calendar request failed", {
          year,
          duration_ms: Date.now() - startedAt,
          error: res.error,
        });
        throw new Error("Error fetching CFB calendar");
      }

      logger.info("cfbd calendar request completed", {
        year,
        duration_ms: Date.now() - startedAt,
        week_count: res.data.length,
      });
      return JSON.stringify(res.data);
    });

    return JSON.parse(cached) as GetCalendarResponse;
  });
}

export async function getApiUserInfo() {
  return await lock.acquire("getApiUserInfo", async () => {
    const cached = await getCachedOrRefresh("cfb-user-info", 60 * 60 * 23, async () => {
      const startedAt = Date.now();
      logger.info("cfbd user info request started");
      const res = await fetchUserInfo({ signal: AbortSignal.timeout(requestTimeoutMs) });

      if (!res.data) {
        logger.error("cfbd user info request failed", {
          duration_ms: Date.now() - startedAt,
          error: res.error,
        });
        throw new Error("Error fetching CFBD user info");
      }

      logger.info("cfbd user info request completed", {
        duration_ms: Date.now() - startedAt,
      });
      return JSON.stringify(res.data);
    });

    return JSON.parse(cached) as UserInfo;
  });
}
