import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import z from "zod";

import type { CFBPick } from "@cfb-picks/db/schema";
import { getGameById } from "@cfb-picks/cfbd";
import { durations, overUnderPickTypes, picks, teamTotalPickTypes } from "@cfb-picks/db/schema";
import { isGameLocked } from "@cfb-picks/lib/dates";
import { getPotential, scorePick, scorePickByWagerAmount } from "@cfb-picks/lib/picks";

import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const ZodPick = z.intersection(
  z.object({
    id: z.number().optional(),
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
) satisfies z.ZodType<
  Omit<CFBPick, "id" | "teamId" | "season" | "createdAt"> & { id?: number | undefined }
>;

function asTypedPick(pick: InferSelectModel<typeof picks>): CFBPick {
  return Object.fromEntries(Object.entries(pick).filter(([_, v]) => v !== null)) as CFBPick;
}

export const picksRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const res = await ctx.db.query.teams.findMany({
      with: {
        users: { columns: { id: true, name: true } },
        picks: {
          where: (pick, { eq }) => eq(pick.season, env.SEASON),
        },
      },
    });

    const teams = [];

    for (const team of res) {
      if (env.NODE_ENV === "production" && team.id === 1) continue;

      const picks = [];

      for (const pick of team.picks.map((p) => asTypedPick(p))) {
        const game = await getGameById(pick.gameId);
        if (!game || !game.completed) continue;

        picks.push({
          ...pick,
          potential: getPotential(pick),
          result: scorePick(pick, game),
          resultByWagerAmount: scorePickByWagerAmount(pick, game),
        });
      }

      teams.push({
        ...team,
        picks,
        totalPicks: picks.length,
        wins: picks.filter((p) => p.result !== null && p.result > 0).length,
        losses: picks.filter((p) => p.result !== null && p.result < 0).length,
        potential: picks.reduce((acc, p) => acc + p.potential, 0),
        winnings: picks.reduce((acc, p) => acc + (p.result ?? 0), 0),
        winningsByWagerAmount: picks.reduce((acc, p) => acc + (p.resultByWagerAmount ?? 0), 0),
      });
    }

    return teams.sort((a, b) => b.winnings - a.winnings);
  }),

  teams: protectedProcedure.query(async ({ ctx }) => {
    const res = await ctx.db.query.teams.findMany({
      with: {
        users: { columns: { id: true, name: true } },
        picks: {
          where: (pick, { eq }) => eq(pick.season, env.SEASON),
        },
      },
    });

    const teams = [];

    for (const team of res) {
      if (env.NODE_ENV === "production" && team.id === 1) continue;

      const picks = [];

      for (const pick of team.picks.map((p) => asTypedPick(p))) {
        const game = await getGameById(pick.gameId);
        if (!game) continue;

        if (!isGameLocked(game.startDate)) continue;

        picks.push({ pick, game });
      }

      teams.push({
        ...team,
        picks: picks
          .sort((a, b) => a.game.startDate.getTime() - b.game.startDate.getTime())
          .map(({ pick }) => pick),
      });
    }

    return teams;
  }),

  selfPicks: protectedProcedure
    .input(
      z.object({
        week: z.number().min(1).max(52).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const res = await ctx.db.query.picks.findMany({
        where: (pick, { and, eq }) =>
          and(
            eq(pick.teamId, ctx.session.user.teamId),
            eq(pick.season, env.SEASON),
            input.week ? eq(pick.week, input.week) : undefined,
          ),
      });

      const picksWithGames = await Promise.all(
        res.map(async (pick) => {
          const game = await getGameById(pick.gameId);
          return { pick, game };
        }),
      );

      return picksWithGames
        .sort((a, b) => {
          if (!a.game || !b.game) return 0;
          return a.game.startDate.getTime() - b.game.startDate.getTime();
        })
        .map(({ pick }) => asTypedPick(pick));
    }),

  makePick: protectedProcedure.input(ZodPick).mutation(async ({ input, ctx }) => {
    if (!ctx.session.user.teamId) {
      throw new Error("User must be assigned to a team to make picks");
    }

    const existingPicks = await ctx.db
      .select()
      .from(picks)
      .where(
        and(
          eq(picks.teamId, ctx.session.user.teamId),
          eq(picks.season, env.SEASON),
          eq(picks.week, input.week),
        ),
      );

    if (!input.id && existingPicks.length > 5) {
      throw new Error("Already have 5 picks for this week");
    }

    if (input.double && existingPicks.filter((p) => p.id !== input.id).some((p) => p.double)) {
      console.error("Existing picks:", existingPicks);
      throw new Error("Cannot have more than one double pick per week");
    }

    if (!input.id) {
      const newPick: InferInsertModel<typeof picks> = {
        teamId: ctx.session.user.teamId,
        season: env.SEASON,
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

      const res = await ctx.db.insert(picks).values(newPick).returning();

      if (res.length !== 1) {
        throw new Error("Failed to create pick");
      }

      return res[0];
    }

    const pick = existingPicks.find((p) => p.id === input.id);
    if (!pick) throw new Error("Pick not found or not authorized to edit");

    const game = await getGameById(pick.gameId);
    if (!game) throw new Error("Game not found for the pick");

    if (isGameLocked(new Date(game.startDate)))
      throw new Error("Cannot edit a pick for a game that has already started");

    const updatedPick: Omit<InferInsertModel<typeof picks>, "id" | "teamId"> = {
      season: env.SEASON,
      week: input.week,
      gameId: input.gameId,
      pickType: input.pickType,
      duration: input.duration,
      odds: input.odds,
      double: input.double,
      total: "total" in input ? input.total : null,
      spread: "spread" in input ? input.spread : null,
      cfbTeamId: "cfbTeamId" in input ? input.cfbTeamId : null,
      createdAt: new Date(),
    };

    const res = await ctx.db
      .update(picks)
      .set(updatedPick)
      .where(and(eq(picks.id, input.id), eq(picks.teamId, ctx.session.user.teamId)))
      .returning();

    if (res.length !== 1) {
      throw new Error("Pick not found or not authorized to edit");
    }

    return res[0];
  }),

  deletePick: protectedProcedure.input(z.number().int()).mutation(async ({ input, ctx }) => {
    if (!ctx.session.user.teamId)
      throw new Error("User must be assigned to a team to delete picks");

    const pick = await ctx.db
      .select()
      .from(picks)
      .where(and(eq(picks.id, input), eq(picks.teamId, ctx.session.user.teamId)))
      .get();

    if (!pick) throw new Error("Pick not found or not authorized to delete");

    const game = await getGameById(pick.gameId);
    if (!game) throw new Error("Game not found for the pick");

    if (isGameLocked(new Date(game.startDate)))
      throw new Error("Cannot delete a pick for a game that has already started");

    const res = await ctx.db
      .delete(picks)
      .where(and(eq(picks.id, input), eq(picks.teamId, ctx.session.user.teamId)));

    if (res.rowsAffected === 0) {
      throw new Error("Pick not found or not authorized to delete");
    }
  }),
});
