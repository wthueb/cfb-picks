import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import z from "zod";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { durations, picks, teams } from "~/server/db/schema";
import type { RouterInputs } from "~/utils/api";
import { gameLocked } from "~/utils/dates";
import { getGameById } from "./cfb";

export type Pick = { id: number } & RouterInputs["picks"]["makePick"];

const teamTotalPickTypes = ["TT_OVER", "TT_UNDER"] as const;
const overUnderPickTypes = ["OVER", "UNDER"] as const;

export type TeamTotalPickType = (typeof teamTotalPickTypes)[number];
export type OverUnderPickType = (typeof overUnderPickTypes)[number];

export const picksRouter = createTRPCRouter({
  teamPicks: protectedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        season: z.number().min(2000).max(new Date().getFullYear()).optional().default(env.SEASON),
        week: z.number().min(1).max(52).optional(),
      }),
    )
    .query(
      async ({ input, ctx }): Promise<{ pick: Pick; team: InferSelectModel<typeof teams> }[]> => {
        const teamId = input.teamId ?? ctx.session.user.teamId;

        if (teamId === null) {
          return [];
        }

        const res = await ctx.db
          .select()
          .from(picks)
          .innerJoin(teams, eq(picks.teamId, teams.id))
          .where(
            and(
              eq(teams.id, teamId),
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
      if (!ctx.session.user.teamId) {
        throw new Error("User must be assigned to a team to make picks");
      }

      const existingPicks = await ctx.db
        .select()
        .from(picks)
        .where(
          and(
            eq(picks.teamId, ctx.session.user.teamId),
            eq(picks.season, input.season),
            eq(picks.week, input.week),
          ),
        );

      if (existingPicks.length > 5) {
        throw new Error("Already have 5 picks for this week");
      }

      if (input.double && existingPicks.some((p) => p.double)) {
        throw new Error("Cannot have more than one double pick per week");
      }

      const newPick: InferInsertModel<typeof picks> = {
        teamId: ctx.session.user.teamId,
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
    if (!ctx.session.user.teamId) {
      throw new Error("User must be assigned to a team to delete picks");
    }

    const pick = await ctx.db
      .select()
      .from(picks)
      .where(and(eq(picks.id, input), eq(picks.teamId, ctx.session.user.teamId)))
      .get();

    if (!pick) {
      throw new Error("Pick not found or not authorized to delete");
    }

    const game = await getGameById(pick.gameId, true);

    if (!game) {
      throw new Error("Game not found for the pick");
    }

    if (gameLocked(new Date(game.startDate))) {
      throw new Error("Cannot delete a pick for a game that has already started");
    }

    const res = await ctx.db
      .delete(picks)
      .where(and(eq(picks.id, input), eq(picks.teamId, ctx.session.user.teamId)));

    if (res.rowsAffected === 0) {
      throw new Error("Pick not found or not authorized to delete");
    }
  }),
});
