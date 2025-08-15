import { and, eq, type InferInsertModel } from "drizzle-orm";
import z from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { picks, pickTypes, teams, users } from "~/server/db/schema";

const overUnderPickTypes = pickTypes.filter(
  (type) => type.endsWith("OVER") || type.endsWith("UNDER"),
) as Extract<(typeof pickTypes)[number], `${string}_OVER` | `${string}_UNDER`>[];

const teamTotalPickTypes = pickTypes.filter((type) => type.endsWith("TT")) as Extract<
  (typeof pickTypes)[number],
  `${string}_TT`
>[];

export const picksRouter = createTRPCRouter({
  selfPicks: protectedProcedure
    .input(
      z.optional(
        z.object({
          season: z.number().min(2000).max(new Date().getFullYear()),
          week: z.number().min(1).max(52).optional(),
        }),
      ),
    )
    .query(async ({ input, ctx }) => {
      const res = await ctx.db
        .select()
        .from(picks)
        .innerJoin(users, eq(picks.userId, users.id))
        .leftJoin(teams, eq(users.teamId, teams.id))
        .where(
          and(
            eq(picks.userId, ctx.session.user.id),
            input ? eq(picks.season, input.season) : undefined,
            input?.week ? eq(picks.week, input.week) : undefined,
          ),
        );

      return res;
    }),

  makePick: protectedProcedure
    .input(
      z.intersection(
        z.object({
          season: z.number().min(2000).max(new Date().getFullYear()),
          week: z.number().min(1).max(52),
          gameId: z.string(),
        }),
        z.union([
          z.object({
            pickType: z.enum(overUnderPickTypes),
            total: z.number(),
          }),
          z.object({
            pickType: z.enum(teamTotalPickTypes),
            total: z.number(),
            cfbTeamId: z.number(),
          }),
          z.object({
            pickType: z.literal("SPREAD"),
            spread: z.number(),
            cfbTeamId: z.number(),
          }),
        ]),
      ),
    )
    .mutation(async ({ input, ctx }) => {
      const existingPicks = await ctx.db
        .select()
        .from(picks)
        .where(
          and(
            eq(picks.userId, ctx.session.user.id),
            eq(picks.season, input.season),
            eq(picks.week, input.week),
          ),
        );

      if (existingPicks.length > 5) {
        throw new Error("Already have 5 picks for this week");
      }

      const newPick: InferInsertModel<typeof picks> = {
        userId: ctx.session.user.id,
        season: input.season,
        week: input.week,
        gameId: input.gameId,
        pickType: input.pickType,
        total: "total" in input ? input.total : null,
        spread: "spread" in input ? input.spread : null,
        cfbTeamId: "cfbTeamId" in input ? input.cfbTeamId : null,
      };

      await ctx.db.insert(picks).values(newPick);

      return newPick;
    }),
});
