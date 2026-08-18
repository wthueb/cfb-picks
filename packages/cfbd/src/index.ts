import type { GetCalendarResponse, GetGamesResponse, GetLinesResponse } from "cfbd";
import AsyncLock from "async-lock";
import { client, getCalendar, getGames, getLines } from "cfbd";

import { getCached, setCached } from "./cache.js";
import { env } from "./env.js";

const lock = new AsyncLock();

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

    const res = await getGames({ query: { year } });

    if (!res.data) {
      console.error(res.error);
      throw new Error("Error fetching CFB games");
    }

    await setCached(cacheKey, JSON.stringify(res.data), 60 * 5);

    return res.data.map(parseGame);
  });
}

export async function getGameById(id: number) {
  const res = await getGamesForYear(env.SEASON);

  const game = res.find((g) => g.id === id);
  if (!game) return null;

  return game;
}

export async function getLinesForYear(year: number) {
  return await lock.acquire("getLinesForYear", async () => {
    const cacheKey = `cfb-lines-${year}`;
    const cached = await getCached(cacheKey);

    if (cached !== null) {
      return JSON.parse(cached) as GetLinesResponse;
    }

    const res = await getLines({ query: { year } });

    if (!res.data) {
      console.error(res.error);
      throw new Error("Error fetching CFB lines");
    }

    await setCached(cacheKey, JSON.stringify(res.data), 60 * 30);

    return res.data;
  });
}

export async function getCalendarForYear(year: number) {
  return await lock.acquire("getCalendarForYear", async () => {
    const cacheKey = `cfb-calendar-${year}`;
    const cached = await getCached(cacheKey);

    if (cached !== null) return JSON.parse(cached) as GetCalendarResponse;

    const res = await getCalendar({ query: { year } });

    if (!res.data) {
      console.error(res.error);
      throw new Error("Error fetching CFB calendar");
    }

    await setCached(cacheKey, JSON.stringify(res.data), 60 * 60 * 6);

    return res.data;
  });
}
