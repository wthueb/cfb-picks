import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getGames } from "@/server/cfb-api";

export const cfbRouter = createTRPCRouter({
  games: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(new Date().getFullYear()),
        week: z.optional(z.number().min(1).max(52)),
      }),
    )
    .query(async ({ input }) => {
      const games = await getGames(input);
      return games
        .filter(
          (game) =>
            game.homeClassification === "fbs" ||
            game.awayClassification === "fbs" ||
            game.homeClassification === "fcs" ||
            game.awayClassification === "fcs",
        )
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }),
});
