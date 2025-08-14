import z from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { client } from "@/server/cfb-api";

export const cfbRouter = createTRPCRouter({
  games: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(new Date().getFullYear()),
        week: z.optional(z.number().min(1).max(52)),
        seasonType: z.optional(z.enum(["regular", "postseason"])),
      }),
    )
    .query(async ({ input }) => {
      const { data, error } = await client.GET("/games", { params: { query: input } });

      if (error) {
        throw new Error(error);
      }

      return data
        .filter(
          (game) =>
            game.homeClassification === "fbs" ||
            game.awayClassification === "fbs" ||
            game.homeClassification === "fcs" ||
            game.awayClassification === "fcs",
        )
        .map((game) => ({ ...game, startDate: new Date(game.startDate) }))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }),

  lines: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(new Date().getFullYear()),
        week: z.optional(z.number().min(1).max(52)),
      }),
    )
    .query(async ({ input }) => {
      const { data, error } = await client.GET("/lines", { params: { query: input } });

      if (error) {
        throw new Error(error);
      }

      return data
        .filter(
          (line) =>
            line.homeClassification === "fbs" ||
            line.awayClassification === "fbs" ||
            line.homeClassification === "fcs" ||
            line.awayClassification === "fcs",
        )
        .map((line) => ({ ...line, startDate: new Date(line.startDate) }))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }),

  calendar: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(new Date().getFullYear()),
      }),
    )
    .query(async ({ input }) => {
      const { data, error } = await client.GET("/calendar", { params: { query: input } });

      if (error) {
        throw new Error(error);
      }

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
