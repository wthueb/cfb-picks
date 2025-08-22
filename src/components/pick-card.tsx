import { Trash2 } from "lucide-react";
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
import type { Pick } from "~/server/api/routers/picks";
import { api } from "~/utils/api";
import { gameLocked } from "~/utils/dates";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick {props.num + 1}</CardTitle>
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
                  </div>
                </TooltipTrigger>
                {game.data && gameLocked(game.data.startDate) && (
                  <TooltipContent side="left" className="bg-accent">
                    <p className="text-accent-foreground text-sm">Game has already started.</p>
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
                : props.pick.pickType.startsWith("TT_")
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
