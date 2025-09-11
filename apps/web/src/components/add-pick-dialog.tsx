import { useEffect, useImperativeHandle, useState } from "react";

import type { CFBPick, Duration, PickType } from "@cfb-picks/db/schema";
import { durations, isTeamTotalPickType, pickTypes } from "@cfb-picks/db/schema";

import type { Week } from "~/server/api/routers/cfb";
import { api } from "~/utils/api";
import { GameCombobox } from "./game-combobox";
import { Select } from "./select";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export type AddPickDialogHandle = {
  clear: () => void;
};

export function AddPickDialog(props: {
  pick?: CFBPick;
  week: Week;
  ref?: React.Ref<AddPickDialogHandle>;
  children: React.ReactNode;
}) {
  useImperativeHandle(props.ref, () => ({ clear }));

  const games = api.cfb.games.useQuery({ week: props.week.week });

  const picks = api.picks.selfPicks.useQuery({ week: props.week.week });
  const canDouble = picks.data
    ? !picks.data.filter((p) => p.id !== props.pick?.id).some((pick) => pick.double)
    : false;

  const utils = api.useUtils();

  const makePick = api.picks.makePick.useMutation({
    onSuccess: async () => {
      await utils.picks.invalidate();
      setOpen(false);
      clear();
    },
  });

  const [open, setOpen] = useState(false);

  const [game, setGame] = useState<NonNullable<typeof games.data>[number]>();
  const [pickType, setPickType] = useState<PickType>("MONEYLINE");
  const [duration, setDuration] = useState<Duration>("FULL");
  const [odds, setOdds] = useState<number>();
  const [double, setDouble] = useState<boolean>(false);
  const [team, setTeam] = useState<number>();
  const [total, setTotal] = useState<number>();
  const [spread, setSpread] = useState<number>();

  useEffect(() => {
    if (props.pick) {
      setGame(games.data?.find((g) => g.id === props.pick?.gameId));
      setPickType(props.pick.pickType);
      setDuration(props.pick.duration);
      setOdds(props.pick.odds);
      setDouble(props.pick.double);
      setTeam("cfbTeamId" in props.pick ? props.pick.cfbTeamId : undefined);
      setTotal("total" in props.pick ? props.pick.total : undefined);
      setSpread("spread" in props.pick ? props.pick.spread : undefined);
    }
  }, [games.data, props.pick]);

  useEffect(() => {
    if (game && (team === undefined || (team && ![game.homeId, game.awayId].includes(team)))) {
      setTeam(game.homeId);
    }
  }, [game, team]);

  const clear = () => {
    setGame(undefined);
    setPickType("SPREAD");
    setDuration("FULL");
    setOdds(undefined);
    setDouble(false);
    setTeam(undefined);
    setTotal(undefined);
    setSpread(undefined);
  };

  const addPick = () => {
    if (!game) return;

    if (!odds) {
      console.error("Odds are required.");
      return;
    }

    if (pickType === "SPREAD") {
      if (!spread) {
        console.error("Spread is required for SPREAD pick type.");
        return;
      }
      if (!team) {
        console.error("Team is required for SPREAD pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week.week,
        gameId: game.id,
        pickType,
        duration,
        odds,
        double,
        cfbTeamId: team,
        spread,
      });
    } else if (pickType === "MONEYLINE") {
      if (!team) {
        console.error("Team is required for MONEYLINE pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week.week,
        gameId: game.id,
        pickType,
        duration,
        odds,
        double,
        cfbTeamId: team,
      });
    } else if (isTeamTotalPickType(pickType)) {
      if (!team) {
        console.error("Team is required for team total pick type.");
        return;
      }
      if (!total) {
        console.error("Total is required for team total pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week.week,
        gameId: game.id,
        pickType,
        duration,
        odds,
        double,
        cfbTeamId: team,
        total,
      });
    } else {
      if (!total) {
        console.error("Total is required for over/under pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week.week,
        gameId: game.id,
        pickType,
        duration,
        odds,
        double,
        total,
      });
    }
  };

  const pickTypeSelectItems = pickTypes.map((type) => ({
    value: type,
    display: type.replace(/_/g, " "),
  }));

  const selectedTeamName = (team === game?.awayId ? game?.awayTeam : game?.homeTeam) ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <DialogHeader className="text-center">
          <DialogTitle>
            {!props.pick ? "Add" : "Edit"} Pick for Week {props.week.week}
          </DialogTitle>
          <DialogDescription>
            Select a game (that hasn&rsquo;t started) and enter your pick.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Game</Label>
            <GameCombobox games={games.data ?? []} defaultValue={game} onChange={setGame} />
          </div>
          {game ? (
            <div className="flex flex-wrap justify-evenly gap-4">
              <div className="flex flex-col gap-2">
                <Label>Pick Type</Label>
                <Select
                  items={pickTypeSelectItems}
                  defaultValue={pickType}
                  onChange={setPickType}
                  className="w-[130px]"
                />
              </div>
              {pickType === "SPREAD" || pickType === "MONEYLINE" ? (
                <>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label>Team</Label>
                    <Select
                      items={[game.homeTeam, game.awayTeam]}
                      defaultValue={selectedTeamName}
                      onChange={(t) => setTeam(t === game.homeTeam ? game.homeId : game.awayId)}
                      className="w-full"
                    />
                  </div>
                  {pickType === "SPREAD" && (
                    <div className="flex flex-col gap-2">
                      <Label>Spread</Label>
                      <Input
                        type="number"
                        placeholder="+/- number"
                        step={0.5}
                        defaultValue={spread}
                        onChange={(e) =>
                          setSpread(!e.target.value ? undefined : parseFloat(e.target.value))
                        }
                        className="w-[130px]"
                      />
                    </div>
                  )}
                </>
              ) : isTeamTotalPickType(pickType) ? (
                <>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label>Team</Label>
                    <Select
                      items={[game.homeTeam, game.awayTeam]}
                      defaultValue={selectedTeamName}
                      onChange={(t) => setTeam(t === game.homeTeam ? game.homeId : game.awayId)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Total</Label>
                    <Input
                      type="number"
                      placeholder="number"
                      min={0}
                      step={0.5}
                      defaultValue={total}
                      onChange={(e) =>
                        setTotal(!e.target.value ? undefined : parseFloat(e.target.value))
                      }
                      className="w-[130px]"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col gap-2">
                  <Label>Total</Label>
                  <Input
                    type="number"
                    placeholder="number"
                    min={0}
                    step={0.5}
                    defaultValue={total}
                    onChange={(e) =>
                      setTotal(!e.target.value ? undefined : parseFloat(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ) : (
            <Skeleton className="h-16.5 w-full" />
          )}
          <div className="flex flex-wrap items-center justify-evenly gap-4">
            <div className="flex flex-col gap-2">
              <Label>Duration</Label>
              <Select items={durations} defaultValue={duration} onChange={setDuration} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="odds">Odds</Label>
              <Input
                id="odds"
                type="number"
                placeholder="+/- number"
                step={10}
                defaultValue={odds}
                onChange={(e) => setOdds(!e.target.value ? undefined : parseFloat(e.target.value))}
                className="w-[130px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="double">Double</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      id="double"
                      disabled={!canDouble}
                      defaultChecked={double}
                      onCheckedChange={setDouble}
                    />
                  </div>
                </TooltipTrigger>
                {!canDouble && (
                  <TooltipContent side="top" className="bg-accent">
                    <p className="text-accent-foreground text-sm">
                      Already made a double pick this week
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {/* TODO: disable button */}
          <Button type="submit" onClick={addPick}>
            Save Pick
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
