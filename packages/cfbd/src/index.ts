import type { GetCalendarResponse, GetGamesResponse, GetLinesResponse } from "cfbd";
import AsyncLock from "async-lock";
import { client, getCalendar, getGames, getLines } from "cfbd";

import { getLogger } from "@cfb-picks/logging";

import { getCached, setCached } from "./cache.js";
import { env } from "./env.js";

export type { DivisionClassification } from "cfbd";

const lock = new AsyncLock();
const logger = getLogger("cfb_picks.cfbd.client");

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
    const cacheKey = `cfb-games-${year}`;
    const cached = await getCached(cacheKey);

    if (cached !== null) return (JSON.parse(cached) as GetGamesResponse).map(parseGame);

    const startedAt = Date.now();
    logger.info("cfbd games request started", { year });
    const res = await getGames({ query: { year } });

    if (!res.data) {
      logger.error("cfbd games request failed", {
        year,
        duration_ms: Date.now() - startedAt,
        error: res.error,
      });
      throw new Error("Error fetching CFB games");
    }

    await setCached(cacheKey, JSON.stringify(res.data), 60 * 5);
    logger.info("cfbd games request completed", {
      year,
      duration_ms: Date.now() - startedAt,
      game_count: res.data.length,
    });

    return res.data.map(parseGame);
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
    const cacheKey = `cfb-lines-${year}`;
    const cached = await getCached(cacheKey);

    if (cached !== null) {
      return JSON.parse(cached) as GetLinesResponse;
    }

    const startedAt = Date.now();
    logger.info("cfbd lines request started", { year });
    const res = await getLines({ query: { year } });

    if (!res.data) {
      logger.error("cfbd lines request failed", {
        year,
        duration_ms: Date.now() - startedAt,
        error: res.error,
      });
      throw new Error("Error fetching CFB lines");
    }

    await setCached(cacheKey, JSON.stringify(res.data), 60 * 30);
    logger.info("cfbd lines request completed", {
      year,
      duration_ms: Date.now() - startedAt,
      line_count: res.data.length,
    });

    return res.data;
  });
}

export async function getCalendarForYear(year: number) {
  return await lock.acquire("getCalendarForYear", async () => {
    const cacheKey = `cfb-calendar-${year}`;
    const cached = await getCached(cacheKey);

    if (cached !== null) return JSON.parse(cached) as GetCalendarResponse;

    const startedAt = Date.now();
    logger.info("cfbd calendar request started", { year });
    const res = await getCalendar({ query: { year } });

    if (!res.data) {
      logger.error("cfbd calendar request failed", {
        year,
        duration_ms: Date.now() - startedAt,
        error: res.error,
      });
      throw new Error("Error fetching CFB calendar");
    }

    await setCached(cacheKey, JSON.stringify(res.data), 60 * 60 * 6);
    logger.info("cfbd calendar request completed", {
      year,
      duration_ms: Date.now() - startedAt,
      week_count: res.data.length,
    });

    return res.data;
  });
}
