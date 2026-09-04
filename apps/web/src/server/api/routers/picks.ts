import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import z from "zod";

import type { CFBPick } from "@cfb-picks/db/schema";
import type { PickInsight } from "@cfb-picks/lib/board";
import { getGameById, getGamesForYear } from "@cfb-picks/cfbd";
import { durations, overUnderPickTypes, picks, teamTotalPickTypes } from "@cfb-picks/db/schema";
import { classifyPickInsights } from "@cfb-picks/lib/board";
import { isGameLocked } from "@cfb-picks/lib/dates";
import { isGameEligibleForPicks } from "@cfb-picks/lib/games";
import { scorePick, scorePickByWagerAmount } from "@cfb-picks/lib/picks";
import { aggregateTeamPerformance, rankTeamPerformance } from "@cfb-picks/lib/stats";
import { getLogger } from "@cfb-picks/logging";

import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const logger = getLogger("cfb_picks.web.picks");

const ZodPickNew = z.intersection(
  z.object({
    week: z.number().min(1).max(52),
    gameId: z.number(),
    duration: z.enum(durations),
    odds: z.number(),
    double: z.boolean(),
  }),
  z.discriminatedUnion("pickType", [
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
) satisfies z.ZodType<Omit<CFBPick, "id" | "teamId" | "season" | "createdAt">>;

const ZodPickExisting = z.intersection(
  z.object({ id: z.number(), teamId: z.number() }),
  ZodPickNew,
) satisfies z.ZodType<Omit<CFBPick, "season" | "createdAt">>;

const ZodPick = z.union([ZodPickExisting, ZodPickNew]);

function asTypedPick(pick: InferSelectModel<typeof picks>): CFBPick {
  return Object.fromEntries(Object.entries(pick).filter(([_, v]) => v !== null)) as CFBPick;
}

export type PickWithGame = CFBPick & { game: NonNullable<Awaited<ReturnType<typeof getGameById>>> };

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

    for (const { picks: teamPicks, ...team } of res) {
      if (env.NODE_ENV === "production" && team.id === 1) continue;

      const scoredPicks = [];

      for (const pick of teamPicks.map((p) => asTypedPick(p))) {
        const game = await getGameById(pick.gameId);

        if (!game) throw new Error(`Game not found for gameId ${pick.gameId}`);

        if (!game.completed) continue;

        const result = scorePick(pick, game);
        const resultByWagerAmount = scorePickByWagerAmount(pick, game);

        if (result === null || resultByWagerAmount === null) continue;

        scoredPicks.push({
          id: pick.id,
          week: pick.week,
          pickType: pick.pickType,
          duration: pick.duration,
          double: pick.double,
          result,
          resultByWagerAmount,
          startDate: game.startDate,
        });
      }

      teams.push({ team, scoredPicks });
    }

    const latestWeek = Math.max(0, ...teams.flatMap((team) => team.scoredPicks.map((p) => p.week)));
    const rankedTeams = rankTeamPerformance(
      teams.map(({ team, scoredPicks }) => ({
        ...team,
        ...aggregateTeamPerformance(scoredPicks, latestWeek),
      })),
    );

    logger.debug("pick statistics generated", {
      season: env.SEASON,
      latest_week: latestWeek,
      team_count: rankedTeams.length,
      scored_pick_count: teams.reduce((count, team) => count + team.scoredPicks.length, 0),
    });
    return { latestWeek, teams: rankedTeams };
  }),

  weeklyBoard: protectedProcedure
    .input(z.object({ week: z.number().int().min(1).max(52).optional() }))
    .query(async ({ input, ctx }) => {
      const res = await ctx.db.query.teams.findMany({
        with: {
          users: { columns: { id: true, name: true } },
          picks: {
            where: (pick, { eq }) => eq(pick.season, env.SEASON),
          },
        },
      });

      const visiblePicks = [];

      for (const { picks: teamPicks, ...team } of res) {
        if (env.NODE_ENV === "production" && team.id === 1) continue;

        for (const pick of teamPicks.map((p) => asTypedPick(p))) {
          const game = await getGameById(pick.gameId);
          if (!game) throw new Error(`Game not found for gameId ${pick.gameId}`);

          const revealed = ctx.session.user.isAdmin || isGameLocked(game.startDate);
          const visible = revealed || pick.teamId === ctx.session.user.teamId;
          if (!visible) continue;

          visiblePicks.push({ pick, game, team, revealed });
        }
      }

      const latestVisibleWeek = Math.max(0, ...visiblePicks.map((entry) => entry.pick.week));
      const week = input.week ?? (latestVisibleWeek || undefined);
      const gamesForYear = await getGamesForYear(env.SEASON);
      const currentWeek =
        gamesForYear
          .filter((game) => !game.completed)
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]?.week ?? 1;
      const selectedWeek = week ?? currentWeek;
      const weekPicks = visiblePicks.filter((entry) => entry.pick.week === selectedWeek);
      const classified = classifyPickInsights(
        weekPicks.filter((entry) => entry.revealed).map((entry) => ({ pick: entry.pick })),
      );
      const insights = new Map(classified.map((entry) => [entry.pick.id, entry.insight]));
      const boardPicks = weekPicks.map((entry) => {
        const insight: PickInsight | "pending" = entry.revealed
          ? (insights.get(entry.pick.id) ?? "unique")
          : "pending";

        return { ...entry, insight };
      });

      const teamResults = res
        .filter((team) => env.NODE_ENV !== "production" || team.id !== 1)
        .map(({ picks: _picks, ...team }) => ({
          ...team,
          picks: boardPicks
            .filter((entry) => entry.team.id === team.id)
            .sort((a, b) => a.game.startDate.getTime() - b.game.startDate.getTime())
            .map(({ pick, game, insight }) => ({ pick, game, insight })),
        }));

      const gameGroups = new Map<number, typeof boardPicks>();

      for (const entry of boardPicks) {
        gameGroups.set(entry.game.id, [...(gameGroups.get(entry.game.id) ?? []), entry]);
      }

      const gameResults = Array.from(gameGroups.entries())
        .flatMap(([id, entries]) => {
          const firstEntry = entries[0];
          if (!firstEntry) return [];

          return [
            {
              id,
              game: firstEntry.game,
              picks: entries.map(({ pick, team, insight }) => ({ pick, team, insight })),
            },
          ];
        })
        .sort((a, b) => a.game.startDate.getTime() - b.game.startDate.getTime());

      const weekGames = gamesForYear.filter((game) => game.week === selectedWeek);

      logger.debug("weekly pick board generated", {
        season: env.SEASON,
        week: selectedWeek,
        team_count: teamResults.length,
        visible_pick_count: boardPicks.length,
        game_count: gameResults.length,
      });
      return {
        week: selectedWeek,
        allGamesLocked:
          weekGames.length > 0 && weekGames.every((game) => isGameLocked(game.startDate)),
        teams: teamResults,
        games: gameResults,
      };
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

      const picks = res.map(asTypedPick);

      const picksWithGames = await Promise.all(
        picks.map(async (pick) => {
          const game = await getGameById(pick.gameId);
          if (!game) throw new Error(`Game not found for gameId ${pick.gameId}`);
          return { ...pick, game } satisfies PickWithGame;
        }),
      );

      logger.debug("team picks loaded", {
        season: env.SEASON,
        week: input.week,
        pick_count: picksWithGames.length,
      });
      return picksWithGames.sort((a, b) => a.game.startDate.getTime() - b.game.startDate.getTime());
    }),

  makePick: protectedProcedure.input(ZodPick).mutation(async ({ input, ctx }) => {
    const teamId =
      "teamId" in input && ctx.session.user.isAdmin ? input.teamId : ctx.session.user.teamId;

    const existingPicks = await ctx.db
      .select()
      .from(picks)
      .where(
        and(eq(picks.teamId, teamId), eq(picks.season, env.SEASON), eq(picks.week, input.week)),
      );

    const id = "id" in input ? input.id : null;

    if (!id && input.pickType === "MONEYLINE") {
      throw new Error("Moneyline picks can no longer be created");
    }

    if (!id && existingPicks.length >= 5) {
      throw new Error("Already have 5 picks for this week");
    }

    if (input.double && existingPicks.filter((p) => p.id !== id).some((p) => p.double)) {
      logger.warning("double pick rejected", {
        season: env.SEASON,
        week: input.week,
        team_id: teamId,
        existing_pick_ids: existingPicks.map((pick) => pick.id),
      });
      throw new Error("Cannot have more than one double pick per week");
    }

    const game = await getGameById(input.gameId);
    if (!game) throw new Error(`Game not found for gameId ${input.gameId}`);
    if (!isGameEligibleForPicks(game)) throw new Error("Cannot pick an FCS vs FCS game");

    if (!ctx.session.user.isAdmin && isGameLocked(new Date(game.startDate)))
      throw new Error("Cannot make a pick for a game that has already started");

    if (!id) {
      const newPick: InferInsertModel<typeof picks> = {
        teamId,
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

      const createdPick = res.length === 1 ? res[0] : undefined;
      if (!createdPick) {
        throw new Error("Failed to create pick");
      }

      logger.info("pick created", {
        pick_id: createdPick.id,
        team_id: teamId,
        game_id: input.gameId,
        season: env.SEASON,
        week: input.week,
        pick_type: input.pickType,
        duration: input.duration,
        double: input.double,
      });
      return createdPick;
    }

    const pick = existingPicks.find((p) => p.id === id);
    if (!pick) throw new Error("Pick not found or not authorized to edit");

    const updatedPick: InferInsertModel<typeof picks> = {
      teamId,
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

    const res = await ctx.db.update(picks).set(updatedPick).where(eq(picks.id, id)).returning();

    if (res.length !== 1) {
      throw new Error("Pick not found or not authorized to edit");
    }

    logger.info("pick updated", {
      pick_id: id,
      team_id: teamId,
      game_id: input.gameId,
      season: env.SEASON,
      week: input.week,
      pick_type: input.pickType,
      duration: input.duration,
      double: input.double,
    });
    return res[0];
  }),

  deletePick: protectedProcedure.input(z.number().int()).mutation(async ({ input, ctx }) => {
    const pick = await ctx.db.select().from(picks).where(eq(picks.id, input)).get();

    if (!pick || (!ctx.session.user.isAdmin && pick.teamId !== ctx.session.user.teamId))
      throw new Error("Pick not found or not authorized to delete");

    const game = await getGameById(pick.gameId);
    if (!game) throw new Error("Game not found for the pick");

    if (!ctx.session.user.isAdmin && isGameLocked(new Date(game.startDate)))
      throw new Error("Cannot delete a pick for a game that has already started");

    const res = await ctx.db.delete(picks).where(eq(picks.id, input));

    if (res.rowsAffected === 0) {
      throw new Error("Pick not found or not authorized to delete");
    }

    logger.info("pick deleted", {
      pick_id: input,
      team_id: pick.teamId,
      game_id: pick.gameId,
      season: pick.season,
      week: pick.week,
    });
  }),
});
