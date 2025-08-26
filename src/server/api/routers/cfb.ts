import {
  client,
  getCalendar,
  getGames,
  getLines,
  type GetCalendarResponse,
  type GetGamesResponse,
  type GetLinesResponse,
} from "cfbd";
import { RunCache } from "run-cache";
import z from "zod";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { RouterOutputs } from "~/utils/api";

export type Week = RouterOutputs["cfb"]["calendar"][number];
export type Game = Omit<GetGamesResponse[number], "startDate"> & { startDate: Date };

client.setConfig({
  headers: {
    Authorization: `Bearer ${env.CFB_API_KEY}`,
  },
});

function parseGame(game: GetGamesResponse[number]): Game {
  return { ...game, startDate: new Date(game.startDate) };
}

async function getGamesForYear(year: number) {
  const cached = await RunCache.get(`cfb-games-${year}`);

  if (cached) {
    return (JSON.parse(cached as string) as GetGamesResponse).map(parseGame);
  }

  const res = await getGames({ query: { year } });

  if (!res.data) {
    console.error(res.error);
    throw new Error("Error fetching CFB games");
  }

  await RunCache.set({
    key: `cfb-games-${year}`,
    value: JSON.stringify(res.data),
    ttl: 1000 * 60 * 60, // 1 hr
  });

  return res.data.map(parseGame);
}

export async function getGameById(id: number, skipCache = false) {
  const cached = await RunCache.get(`cfb-game-${id}`);

  if (!skipCache && cached) {
    return parseGame(JSON.parse(cached as string) as GetGamesResponse[number]);
  }

  const res = await getGames({ query: { id } });

  if (!res.data) {
    console.error(res.error);
    throw new Error("Error fetching CFB game by ID");
  }

  const game = res.data[0];
  if (!game) return null;

  await RunCache.set({
    key: `cfb-game-${id}`,
    value: JSON.stringify(game),
    ttl: game.completed ? undefined : 1000 * 60 * 5, // 5 min
  });

  return parseGame(game);
}

async function getLinesForYear(year: number) {
  const cached = await RunCache.get(`cfb-lines-${year}`);

  if (cached) {
    return JSON.parse(cached as string) as GetLinesResponse;
  }

  const res = await getLines({ query: { year } });

  if (!res.data) {
    console.error(res.error);
    throw new Error("Error fetching CFB lines");
  }

  await RunCache.set({
    key: `cfb-lines-${year}`,
    value: JSON.stringify(res.data),
    ttl: 1000 * 60 * 30, // 30 min
  });

  return res.data;
}

async function getCalendarForYear(year: number) {
  const cached = await RunCache.get(`cfb-calendar-${year}`);

  if (cached) return JSON.parse(cached as string) as GetCalendarResponse;

  const res = await getCalendar({ query: { year } });

  if (!res.data) {
    console.error(res.error);
    throw new Error("Error fetching CFB calendar");
  }

  await RunCache.set({
    key: `cfb-calendar-${year}`,
    value: JSON.stringify(res.data),
    ttl: 1000 * 60 * 60 * 6, // 6 hr
  });

  return res.data;
}

export const cfbRouter = createTRPCRouter({
  games: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(new Date().getFullYear()).optional().default(env.SEASON),
        week: z.optional(z.number().min(1).max(52)),
        seasonType: z.optional(z.enum(["regular", "postseason"])),
      }),
    )
    .query(async ({ input }) => {
      const gamesForYear = await getGamesForYear(input.year);
      return gamesForYear
        .filter(
          (game) =>
            (!input.week || game.week === input.week) &&
            (!input.seasonType || game.seasonType === input.seasonType) &&
            (game.homeClassification === "fbs" ||
              game.awayClassification === "fbs" ||
              game.homeClassification === "fcs" ||
              game.awayClassification === "fcs"),
        )
        .map((game) => ({ ...game, startDate: new Date(game.startDate) }))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }),

  gameById: protectedProcedure.input(z.number().int().min(1)).query(async ({ input }) => {
    const game = await getGameById(input);
    if (!game) throw new Error(`Game with ID ${input} not found`);

    return game;
  }),

  lines: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(new Date().getFullYear()),
        week: z.optional(z.number().min(1).max(52)),
      }),
    )
    .query(async ({ input }) => {
      const linesForYear = await getLinesForYear(input.year);

      return linesForYear
        .filter(
          (line) =>
            (!input.week || line.week === input.week) &&
            (line.homeClassification === "fbs" ||
              line.awayClassification === "fbs" ||
              line.homeClassification === "fcs" ||
              line.awayClassification === "fcs"),
        )
        .map((line) => ({ ...line, startDate: new Date(line.startDate) }))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }),

  calendar: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(new Date().getFullYear()).optional().default(env.SEASON),
      }),
    )
    .query(async ({ input }) => {
      const data = await getCalendarForYear(input.year);

      const normalWeeks = data.filter(
        (week) => week.seasonType === "regular" || week.seasonType === "postseason",
      ) as (Omit<(typeof data)[number], "seasonType"> & { seasonType: "regular" | "postseason" })[];

      return normalWeeks.map((week) => ({
        ...week,
        startDate: new Date(week.startDate),
        endDate: new Date(week.endDate),
      }));
    }),
});
