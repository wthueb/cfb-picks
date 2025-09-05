import type { GetCalendarResponse, GetGamesResponse, GetLinesResponse } from "cfbd";
import AsyncLock from "async-lock";
import { client, getCalendar, getGames, getLines } from "cfbd";

import { client as cache } from "./cache.js";
import { env } from "./env.js";

const lock = new AsyncLock();

export type Game = Omit<GetGamesResponse[number], "startDate"> & {
  startDate: Date;
};

client.setConfig({
  headers: {
    Authorization: `Bearer ${env.CFB_API_KEY}`,
  },
});

function parseGame(game: GetGamesResponse[number]): Game {
  return { ...game, startDate: new Date(game.startDate) };
}

export async function getGamesForYear(year: number) {
  return await lock.acquire("getGamesForYear", async () => {
    const cached = await cache.get(`cfb-games-${year}`);

    if (cached) return (JSON.parse(cached) as GetGamesResponse).map(parseGame);

    const res = await getGames({ query: { year } });

    if (!res.data) {
      console.error(res.error);
      throw new Error("Error fetching CFB games");
    }

    await cache.set(`cfb-games-${year}`, JSON.stringify(res.data), {
      expiration: {
        type: "EX",
        value: 60 * 5, // 5 min
      },
    });

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
    const cached = await cache.get(`cfb-lines-${year}`);

    if (cached) {
      return JSON.parse(cached) as GetLinesResponse;
    }

    const res = await getLines({ query: { year } });

    if (!res.data) {
      console.error(res.error);
      throw new Error("Error fetching CFB lines");
    }

    await cache.set(`cfb-lines-${year}`, JSON.stringify(res.data), {
      expiration: {
        type: "EX",
        value: 60 * 30, // 30 min
      },
    });

    return res.data;
  });
}

export async function getCalendarForYear(year: number) {
  return await lock.acquire("getCalendarForYear", async () => {
    const cached = await cache.get(`cfb-calendar-${year}`);

    if (cached) return JSON.parse(cached) as GetCalendarResponse;

    const res = await getCalendar({ query: { year } });

    if (!res.data) {
      console.error(res.error);
      throw new Error("Error fetching CFB calendar");
    }

    await cache.set(`cfb-calendar-${year}`, JSON.stringify(res.data), {
      expiration: {
        type: "EX",
        value: 60 * 60 * 6, // 6 hr
      },
    });

    return res.data;
  });
}
