import z from "zod";

import { getCalendarForYear, getGameById, getGamesForYear, getLinesForYear } from "@cfb-picks/cfbd";
import { isGameEligibleForPicks } from "@cfb-picks/lib/games";
import { getLogger } from "@cfb-picks/logging";

import type { RouterOutputs } from "~/utils/api";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export type Week = RouterOutputs["cfb"]["calendar"][number];

const logger = getLogger("cfb_picks.web.cfb");

export const cfbRouter = createTRPCRouter({
  games: protectedProcedure
    .input(
      z.object({
        week: z.optional(z.number().min(1).max(52)),
      }),
    )
    .query(async ({ input }) => {
      const gamesForYear = await getGamesForYear(env.SEASON);
      const games = gamesForYear
        .filter((game) => (!input.week || game.week === input.week) && isGameEligibleForPicks(game))
        .map((game) => ({ ...game, startDate: new Date(game.startDate) }))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      logger.debug("cfb games loaded", {
        season: env.SEASON,
        week: input.week,
        game_count: games.length,
      });
      return games;
    }),

  gameById: protectedProcedure.input(z.number().int().min(1)).query(async ({ input }) => {
    const game = await getGameById(input);
    if (!game) throw new Error(`Game with ID ${input} not found`);

    logger.debug("cfb game loaded", { game_id: input, season: env.SEASON });
    return game;
  }),

  lines: protectedProcedure
    .input(
      z.object({
        week: z.optional(z.number().min(1).max(52)),
      }),
    )
    .query(async ({ input }) => {
      const linesForYear = await getLinesForYear(env.SEASON);

      const lines = linesForYear
        .filter((line) => (!input.week || line.week === input.week) && isGameEligibleForPicks(line))
        .map((line) => ({ ...line, startDate: new Date(line.startDate) }))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      logger.debug("cfb lines loaded", {
        season: env.SEASON,
        week: input.week,
        line_count: lines.length,
      });
      return lines;
    }),

  calendar: protectedProcedure.query(async () => {
    const data = await getCalendarForYear(env.SEASON);

    const normalWeeks = data.filter((week) => week.seasonType === "regular") as (Omit<
      (typeof data)[number],
      "seasonType"
    > & {
      seasonType: "regular";
    })[];

    const calendar = normalWeeks.map((week) => ({
      ...week,
      startDate: new Date(week.startDate),
      endDate: new Date(week.endDate),
    }));
    logger.debug("cfb calendar loaded", {
      season: env.SEASON,
      week_count: calendar.length,
    });
    return calendar;
  }),
});
