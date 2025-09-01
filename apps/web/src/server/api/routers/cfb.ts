import z from "zod";

import { getCalendarForYear, getGameById, getGamesForYear, getLinesForYear } from "@cfb-picks/cfbd";

import type { RouterOutputs } from "~/utils/api";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export type Week = RouterOutputs["cfb"]["calendar"][number];

export const cfbRouter = createTRPCRouter({
  games: protectedProcedure
    .input(
      z.object({
        week: z.optional(z.number().min(1).max(52)),
      }),
    )
    .query(async ({ input }) => {
      const gamesForYear = await getGamesForYear(env.SEASON);
      return gamesForYear
        .filter(
          (game) =>
            (!input.week || game.week === input.week) &&
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
        week: z.optional(z.number().min(1).max(52)),
      }),
    )
    .query(async ({ input }) => {
      const linesForYear = await getLinesForYear(env.SEASON);

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

  calendar: protectedProcedure.query(async () => {
    const data = await getCalendarForYear(env.SEASON);

    const normalWeeks = data.filter((week) => week.seasonType === "regular") as (Omit<
      (typeof data)[number],
      "seasonType"
    > & {
      seasonType: "regular";
    })[];

    return normalWeeks.map((week) => ({
      ...week,
      startDate: new Date(week.startDate),
      endDate: new Date(week.endDate),
    }));
  }),
});
