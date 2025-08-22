import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import z from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { durations, picks, teams, users } from "~/server/db/schema";
import type { RouterInputs } from "~/utils/api";

export type Pick = { id: number } & RouterInputs["picks"]["makePick"];

const teamTotalPickTypes = ["TT_OVER", "TT_UNDER"] as const;
const overUnderPickTypes = ["OVER", "UNDER"] as const;

export type TeamTotalPickType = (typeof teamTotalPickTypes)[number];
export type OverUnderPickType = (typeof overUnderPickTypes)[number];

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
    .query(
      async ({
        input,
        ctx,
      }): Promise<
        {
          pick: Pick;
          user: InferSelectModel<typeof users>;
          team: InferSelectModel<typeof teams>;
        }[]
      > => {
        const res = await ctx.db
          .select()
          .from(picks)
          .innerJoin(users, eq(picks.userId, users.id))
          .innerJoin(teams, eq(users.teamId, teams.id))
          .where(
            and(
              eq(picks.userId, ctx.session.user.id),
              input ? eq(picks.season, input.season) : undefined,
              input?.week ? eq(picks.week, input.week) : undefined,
            ),
          );

        return res.map((r) => ({
          ...r,
          pick: r.pick as Pick,
        }));
      },
    ),

  makePick: protectedProcedure
    .input(
      z.intersection(
        z.object({
          season: z.number().min(2000).max(new Date().getFullYear()),
          week: z.number().min(1).max(52),
          gameId: z.number(),
          duration: z.enum(durations),
          odds: z.number(),
          double: z.boolean(),
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
          z.object({
            pickType: z.literal("MONEYLINE"),
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
        duration: input.duration,
        odds: input.odds,
        double: input.double,
        total: "total" in input ? input.total : null,
        spread: "spread" in input ? input.spread : null,
        cfbTeamId: "cfbTeamId" in input ? input.cfbTeamId : null,
      };

      await ctx.db.insert(picks).values(newPick);

      return newPick;
    }),

  deletePick: protectedProcedure.input(z.number().int()).mutation(async ({ input, ctx }) => {
    const res = await ctx.db
      .delete(picks)
      .where(and(eq(picks.id, input), eq(picks.userId, ctx.session.user.id)));

    if (res.rowsAffected === 0) {
      throw new Error("Pick not found or not authorized to delete");
    }
  }),
});
