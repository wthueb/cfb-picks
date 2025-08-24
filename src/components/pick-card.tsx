import { Check, CircleDashed, Minus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import type { Game } from "~/server/api/routers/cfb";
import type { Pick } from "~/server/api/routers/picks";
import { isTeamTotalPickType } from "~/server/db/schema";
import { api } from "~/utils/api";
import { gameLocked } from "~/utils/dates";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

enum PickResult {
  WIN = "WIN",
  LOSS = "LOSS",
  PUSH = "PUSH",
}

function isPickWinner(pick: Pick, game: Game): PickResult | null {
  if (!game.completed) return null;

  const homeLineScores = game.homeLineScores ?? [0, 0, 0, 0];
  const awayLineScores = game.awayLineScores ?? [0, 0, 0, 0];

  const homeScore =
    pick.duration === "1Q"
      ? homeLineScores[0]!
      : pick.duration === "1H"
        ? homeLineScores[0]! + homeLineScores[1]!
        : (game.homePoints ?? 0);

  const awayScore =
    pick.duration === "1Q"
      ? awayLineScores[0]!
      : pick.duration === "1H"
        ? awayLineScores[0]! + awayLineScores[1]!
        : (game.awayPoints ?? 0);

  if (pick.pickType === "SPREAD") {
    const teamScore = game.homeId === pick.cfbTeamId ? homeScore : awayScore;
    const opponentScore = game.homeId === pick.cfbTeamId ? awayScore : homeScore;

    if (teamScore + pick.spread === opponentScore) return PickResult.PUSH;
    return teamScore + pick.spread > opponentScore ? PickResult.WIN : PickResult.LOSS;
  }

  if (pick.pickType === "MONEYLINE") {
    const teamScore = game.homeId === pick.cfbTeamId ? homeScore : awayScore;
    const opponentScore = game.homeId === pick.cfbTeamId ? awayScore : homeScore;

    return teamScore > opponentScore ? PickResult.WIN : PickResult.LOSS;
  }

  const total =
    "cfbTeamId" in pick
      ? game.homeId === pick.cfbTeamId
        ? homeScore
        : awayScore
      : homeScore + awayScore;

  if (total === pick.total) return PickResult.PUSH;

  if (pick.pickType.endsWith("OVER")) return total > pick.total ? PickResult.WIN : PickResult.LOSS;
  if (pick.pickType.endsWith("UNDER")) return total < pick.total ? PickResult.WIN : PickResult.LOSS;

  throw new Error("Invalid pick type");
}

export function PickCard(props: { pick: Pick; num: number }) {
  const game = api.cfb.gameById.useQuery(props.pick.gameId, {
    refetchInterval: 1000 * 60, // 1 minute
  });

  const util = api.useUtils();

  const deletePick = api.picks.deletePick.useMutation({
    onSuccess: async () => {
      await util.picks.invalidate();
    },
  });

  const team =
    "cfbTeamId" in props.pick
      ? game.data?.homeId === props.pick.cfbTeamId
        ? game.data?.homeTeam
        : game.data?.awayTeam
      : undefined;

  const now = new Date();

  const pickStatus = game.data ? isPickWinner(props.pick, game.data) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary-foreground">Pick {props.num + 1}</CardTitle>
        <CardDescription>
          {game.data ? (
            `${game.data.awayTeam} @ ${game.data.homeTeam} (${game.data.startDate.toLocaleString(
              "en-US",
              {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              },
            )})`
          ) : (
            <Skeleton className="h-5 w-full" />
          )}
        </CardDescription>
        <CardAction>
          {!game.data ? (
            <Skeleton className="h-8 w-8" />
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {now < game.data.startDate ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={gameLocked(game.data.startDate)}
                            className="text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete your pick.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deletePick.mutate(props.pick.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : game.data.completed ? (
                      pickStatus === PickResult.WIN ? (
                        <Check className="text-primary-foreground" />
                      ) : pickStatus === PickResult.LOSS ? (
                        <X className="text-destructive" />
                      ) : (
                        <Minus />
                      )
                    ) : (
                      <CircleDashed />
                    )}
                  </div>
                </TooltipTrigger>
                {now < game.data.startDate
                  ? gameLocked(game.data.startDate) && (
                      <TooltipContent side="left" className="bg-accent">
                        <p className="text-accent-foreground text-sm">Pick is locked</p>
                      </TooltipContent>
                    )
                  : !game.data.completed && (
                      <TooltipContent side="left" className="bg-accent">
                        <p className="text-accent-foreground text-sm">Game in progress</p>
                      </TooltipContent>
                    )}
              </Tooltip>
            </TooltipProvider>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {game.data ? (
          <span>
            {props.pick.pickType === "SPREAD"
              ? `${team} ${props.pick.spread > 0 ? "+" : ""}${props.pick.spread}`
              : props.pick.pickType === "MONEYLINE"
                ? `${team} ML`
                : isTeamTotalPickType(props.pick.pickType)
                  ? `${team} Team Total ${props.pick.pickType.endsWith("OVER") ? "o" : "u"}${props.pick.total}`
                  : `${props.pick.pickType === "OVER" ? "o" : "u"}${props.pick.total}`}
            {props.pick.duration !== "FULL" && ` (${props.pick.duration}) `}
            {` (${props.pick.odds > 0 ? "+" : ""}${props.pick.odds})${props.pick.double ? " (2u)" : ""}`}
          </span>
        ) : (
          <Skeleton className="h-6 w-full" />
        )}
      </CardContent>
      {/*<CardFooter>current score</CardFooter>*/}
    </Card>
  );
}
