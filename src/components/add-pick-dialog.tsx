import { useImperativeHandle, useState } from "react";
import type { Week } from "~/server/api/routers/cfb";
import type { OverUnderPickType, PickType, TeamTotalPickType } from "~/server/api/routers/picks";
import { pickTypes } from "~/server/db/schema";
import { api } from "~/utils/api";
import { GameCombobox } from "./game-combobox";
import { GenericSelect } from "./generic-select";
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

export type AddPickDialogHandle = {
  clear: () => void;
};

export function AddPickDialog(
  props: React.PropsWithChildren<{
    week: Week | null;
    ref?: React.Ref<AddPickDialogHandle>;
  }>,
) {
  useImperativeHandle(props.ref, () => ({ clear }));

  const games = api.cfb.games.useQuery(
    {
      year: props.week?.season ?? parseInt(process.env.NEXT_PUBLIC_SEASON!),
      week: props.week?.week,
      seasonType: props.week?.seasonType,
    },
    {
      enabled: !!props.week,
      select: (data) => {
        const now = new Date();
        return data.filter((game) => game.startDate > now);
      },
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
  const [pickType, setPickType] = useState<PickType>("SPREAD");
  const [odds, setOdds] = useState<number | null>(null);
  const [double, setDouble] = useState<boolean>(false);
  const [team, setTeam] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [spread, setSpread] = useState<number | null>(null);

  const pickTypeSelectItems = pickTypes.map((type) => ({
    value: type,
    display: type.replace(/_/g, " "),
  }));

  const clear = () => {
    setGame(null);
    setPickType("SPREAD");
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
        odds,
        double,
        cfbTeamId: team,
        spread,
      });
    } else if (pickType.includes("_TT_")) {
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
        pickType: pickType as TeamTotalPickType,
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
        pickType: pickType as OverUnderPickType,
        odds,
        double,
        total,
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      {props.week && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Pick for Week {props.week.week} (
              {props.week.seasonType === "regular" ? "Regular Season" : "Playoffs"})
            </DialogTitle>
            <DialogDescription>
              Select a game (that hasn&rsquo;t started) and enter your pick.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Label>Game</Label>
            <GameCombobox games={games.data ?? []} onChange={setGame} />
          </div>
          {game ? (
            <>
              <div className="flex gap-4">
                <div className="flex flex-col gap-4">
                  <Label>Pick Type</Label>
                  <GenericSelect
                    items={pickTypeSelectItems}
                    defaultValue={pickType}
                    onChange={setPickType}
                    className="w-[130px]"
                  />
                </div>
                {(pickType.endsWith("_OVER") || pickType.endsWith("_UNDER")) &&
                  !pickType.includes("_TT_") && (
                    <>
                      <div className="flex flex-1 flex-col gap-4">
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
                    </>
                  )}
                {(pickType.endsWith("_OVER") || pickType.endsWith("_UNDER")) &&
                  pickType.includes("_TT_") && (
                    <>
                      <div className="flex flex-1 flex-col gap-4">
                        <Label>Team</Label>
                        <GenericSelect
                          items={[game.homeTeam, game.awayTeam]}
                          defaultValue={game.homeTeam}
                          onChange={(t) => setTeam(t === game.homeTeam ? game.homeId : game.awayId)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-4">
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
                  )}
                {pickType === "SPREAD" && (
                  <>
                    <div className="flex flex-1 flex-col gap-4">
                      <Label>Team</Label>
                      <GenericSelect
                        items={[game.homeTeam, game.awayTeam]}
                        defaultValue={game.homeTeam}
                        onChange={(t) => setTeam(t === game.homeTeam ? game.homeId : game.awayId)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <Label>Spread</Label>
                      <Input
                        type="number"
                        placeholder="+/- number"
                        step={0.5}
                        onChange={(e) => setSpread(parseFloat(e.target.value))}
                        className="w-[130px]"
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <Skeleton className="h-16.5 w-full" />
          )}
          <div className="flex items-center justify-evenly gap-4">
            <div className="flex gap-4">
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
            <div className="flex gap-4">
              <Label htmlFor="double">Double</Label>
              <Switch id="double" disabled={false} onCheckedChange={setDouble} />
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
