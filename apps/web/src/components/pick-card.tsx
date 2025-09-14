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
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/utils/api";
import { AddPickDialog } from "./add-pick-dialog";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function PickCard(props: { pick: PickWithGame; num: number }) {
  const session = useSession();

  const { pick } = props;

  const team =
    "cfbTeamId" in pick
      ? pick.game.homeId === pick.cfbTeamId
        ? pick.game.homeTeam
        : pick.game.awayTeam
      : undefined;

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 5 * 1000);
    return () => clearInterval(interval);
  }, []);

  const pickStatus = useMemo(() => getPickResult(pick, pick.game), [pick]);
  const gameLocked = useMemo(() => isGameLocked(pick.game.startDate), [pick]);

  enum ActionType {
    EditDelete,
    Locked,
    InProgress,
    Win,
    Loss,
    Push,
  }

  const actionType = !gameLocked
    ? ActionType.EditDelete
    : !pick.game.completed
      ? now < pick.game.startDate
        ? ActionType.Locked
        : ActionType.InProgress
      : pickStatus === PickResult.Win
        ? ActionType.Win
        : pickStatus === PickResult.Loss
          ? ActionType.Loss
          : ActionType.Push;

  return (
    <Card data-id={pick.id} className="gap-3">
      <CardHeader>
        <CardTitle className="text-primary-foreground">Pick {props.num + 1}</CardTitle>
        <CardDescription>
          {pick.game.awayTeam} @ {pick.game.homeTeam} (
          {pick.game.startDate.toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          )
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {actionType === ActionType.Locked && <Locked />}
          {actionType === ActionType.InProgress && <InProgress />}
          {actionType === ActionType.Win && <Check className="text-primary-foreground" />}
          {actionType === ActionType.Loss && <X className="text-destructive" />}
          {actionType === ActionType.Push && <Minus />}
          {(actionType === ActionType.EditDelete || session.data?.user.isAdmin) && (
            <div>
              <AddPickDialog pick={pick} week={pick.week}>
                <Button variant="ghost" size="icon">
                  <Pencil />
                </Button>
              </AddPickDialog>
              <DeleteButton pickId={pick.id} />
            </div>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <span>
          {pick.pickType === "SPREAD"
            ? `${team} ${pick.spread > 0 ? "+" : ""}${pick.spread}`
            : pick.pickType === "MONEYLINE"
              ? `${team} ML`
              : isTeamTotalPickType(pick.pickType)
                ? `${team} Team Total ${pick.pickType.endsWith("OVER") ? "o" : "u"}${pick.total}`
                : `${pick.pickType === "OVER" ? "o" : "u"}${pick.total}`}
          {pick.duration !== "FULL" && ` (${pick.duration}) `}
          {` (${pick.odds > 0 ? "+" : ""}${pick.odds})${pick.double ? " (2u)" : ""}`}
        </span>
      </CardContent>
      {/* we don't get live scores unless we use different endpoints */}
      {pick.game.completed && (
        <CardFooter className="text-muted-foreground text-sm">
          {/* maybe show quarterly scores? formatting to be concise would be tricky */}
          <span>
            {pick.game.awayTeam} {pick.game.awayPoints} - {pick.game.homePoints}{" "}
            {pick.game.homeTeam}
          </span>
        </CardFooter>
      )}
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
