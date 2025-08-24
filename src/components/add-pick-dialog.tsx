import { useEffect, useImperativeHandle, useState } from "react";
import type { Week } from "~/server/api/routers/cfb";
import {
  durations,
  isTeamTotalPickType,
  pickTypes,
  type Duration,
  type PickType,
} from "~/server/db/schema";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export type AddPickDialogHandle = {
  clear: () => void;
};

export function AddPickDialog(
  props: React.PropsWithChildren<{
    week: Week | null;
    canDouble: boolean;
    ref?: React.Ref<AddPickDialogHandle>;
  }>,
) {
  useImperativeHandle(props.ref, () => ({ clear }));

  const games = api.cfb.games.useQuery(
    {
      year: props.week?.season,
      week: props.week?.week,
      seasonType: props.week?.seasonType,
    },
    {
      enabled: !!props.week,
    },
  );

  const utils = api.useUtils();

  const makePick = api.picks.makePick.useMutation({
    onSuccess: async () => {
      await utils.picks.invalidate();
      setOpen(false);
      clear();
    },
  });

  const [open, setOpen] = useState(false);

  const [game, setGame] = useState<NonNullable<typeof games.data>[number] | null>(null);
  const [pickType, setPickType] = useState<PickType>("MONEYLINE");
  const [duration, setDuration] = useState<Duration>("FULL");
  const [odds, setOdds] = useState<number | null>(null);
  const [double, setDouble] = useState<boolean>(false);
  const [team, setTeam] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [spread, setSpread] = useState<number | null>(null);

  useEffect(() => {
    if (game) {
      setTeam(game.homeId);
    }
  }, [game]);

  const clear = () => {
    setGame(null);
    setPickType("SPREAD");
    setDuration("FULL");
    setTotal(null);
    setTeam(null);
    setSpread(null);
    setOdds(null);
    setDouble(false);
  };

  const addPick = () => {
    if (!props.week || !game) return;

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
        season: props.week.season,
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
        season: props.week.season,
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
        season: props.week.season,
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
        season: props.week.season,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      {props.week && (
        <DialogContent>
          <DialogHeader className="text-center">
            <DialogTitle>
              Add Pick for Week {props.week.week} (
              {props.week.seasonType === "regular" ? "Regular Season" : "Playoffs"})
            </DialogTitle>
            <DialogDescription>
              Select a game (that hasn&rsquo;t started) and enter your pick.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Game</Label>
              <GameCombobox games={games.data ?? []} onChange={setGame} />
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
                        defaultValue={game.homeTeam}
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
                          onChange={(e) => setSpread(parseFloat(e.target.value))}
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
                        defaultValue={game.homeTeam}
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
                        onChange={(e) => setTotal(parseFloat(e.target.value))}
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
                      onChange={(e) => setTotal(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <Skeleton className="h-16.5 w-full" />
            )}
            <div className="flex flex-wrap items-center justify-evenly gap-4">
              <div className="flex gap-2">
                <Label>Duration</Label>
                <Select items={durations} defaultValue="FULL" onChange={setDuration} />
              </div>
              <div className="flex gap-2">
                <Label htmlFor="odds">Odds</Label>
                <Input
                  id="odds"
                  type="number"
                  placeholder="+/- number"
                  step={10}
                  onChange={(e) => setOdds(parseFloat(e.target.value))}
                  className="w-[130px]"
                />
              </div>
              <div className="flex gap-2">
                <Label htmlFor="double">Double</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          id="double"
                          disabled={!props.canDouble}
                          onCheckedChange={setDouble}
                        />
                      </div>
                    </TooltipTrigger>
                    {!props.canDouble && (
                      <TooltipContent side="top" className="bg-accent">
                        <p className="text-accent-foreground text-sm">
                          Already made a double pick this week.
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
      )}
    </Dialog>
  );
}
