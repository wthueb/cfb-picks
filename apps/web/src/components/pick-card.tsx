import { useEffect, useMemo, useState } from "react";
import { Check, CircleDashed, Lock, Minus, Pencil, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";

import { isTeamTotalPickType } from "@cfb-picks/db/schema";
import { isGameLocked } from "@cfb-picks/lib/dates";
import { getPickResult, PickResult } from "@cfb-picks/lib/picks";

import type { PickWithGame } from "~/server/api/routers/picks";
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
import { api } from "~/utils/api";
import { AddPickDialog } from "./add-pick-dialog";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function PickCard(props: { pick: PickWithGame; num: number }) {
  const session = useSession();

  const team =
    "cfbTeamId" in props.pick
      ? props.pick.game?.homeId === props.pick.cfbTeamId
        ? props.pick.game.homeTeam
        : props.pick.game?.awayTeam
      : undefined;

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 5 * 1000);
    return () => clearInterval(interval);
  }, []);

  const pickStatus = useMemo(
    () => (props.pick.game ? getPickResult(props.pick, props.pick.game) : null),
    [props.pick],
  );
  const gameLocked = useMemo(
    () => (props.pick.game ? isGameLocked(props.pick.game.startDate) : true),
    [props.pick],
  );

  enum ActionType {
    EditDelete,
    Locked,
    InProgress,
    Win,
    Loss,
    Push,
    None,
  }

  const actionType = !props.pick.game
    ? ActionType.None
    : !gameLocked
      ? ActionType.EditDelete
      : !props.pick.game.completed
        ? now < props.pick.game.startDate
          ? ActionType.Locked
          : ActionType.InProgress
        : pickStatus === PickResult.Win
          ? ActionType.Win
          : pickStatus === PickResult.Loss
            ? ActionType.Loss
            : ActionType.Push;

  return (
    <Card data-id={props.pick.id}>
      <CardHeader>
        <CardTitle className="text-primary-foreground">Pick {props.num + 1}</CardTitle>
        <CardDescription>
          {props.pick.game ? (
            `${props.pick.game.awayTeam} @ ${props.pick.game.homeTeam} (${props.pick.game.startDate.toLocaleString(
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
        <CardAction className="flex items-center gap-2">
          {actionType === ActionType.None && <Skeleton className="h-8 w-8" />}
          {actionType === ActionType.Locked && <Locked />}
          {actionType === ActionType.InProgress && <InProgress />}
          {actionType === ActionType.Win && <Check className="text-primary-foreground" />}
          {actionType === ActionType.Loss && <X className="text-destructive" />}
          {actionType === ActionType.Push && <Minus />}
          {(actionType === ActionType.EditDelete || session.data?.user.isAdmin) && (
            <div>
              <AddPickDialog pick={props.pick} week={props.pick.week}>
                <Button variant="ghost" size="icon">
                  <Pencil />
                </Button>
              </AddPickDialog>
              <DeleteButton pickId={props.pick.id} />
            </div>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {props.pick.game ? (
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
      {/* TODO: <CardFooter>current score</CardFooter>*/}
    </Card>
  );
}

function DeleteButton(props: { pickId: number }) {
  const util = api.useUtils();

  const deletePick = api.picks.deletePick.useMutation({
    onSuccess: async () => {
      await util.picks.invalidate();
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently delete your pick.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => deletePick.mutate(props.pickId)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Locked() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Lock />
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-accent">
        <p className="text-accent-foreground text-sm">Pick is locked</p>
      </TooltipContent>
    </Tooltip>
  );
}

function InProgress() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CircleDashed />
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-accent">
        <p className="text-accent-foreground text-sm">Game in progress</p>
      </TooltipContent>
    </Tooltip>
  );
}
