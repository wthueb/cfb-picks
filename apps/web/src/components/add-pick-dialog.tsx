import { useEffect, useImperativeHandle, useReducer, useState } from "react";

import type { CFBPick, Duration, PickType } from "@cfb-picks/db/schema";
import { durations, isTeamTotalPickType, pickTypes } from "@cfb-picks/db/schema";

import type { RouterOutputs } from "~/utils/api";
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

type GameType = RouterOutputs["cfb"]["games"][number];

type PickFormState = {
  game?: GameType;
  pickType: PickType;
  duration: Duration;
  odds?: number;
  double: boolean;
  team?: number;
  total?: number;
  spread?: number;
};

type PickFormAction =
  | { type: "SET_GAME"; game?: PickFormState["game"] }
  | { type: "SET_PICK_TYPE"; pickType: PickType }
  | { type: "SET_DURATION"; duration: Duration }
  | { type: "SET_ODDS"; odds?: number }
  | { type: "SET_DOUBLE"; double: boolean }
  | { type: "SET_TEAM"; team?: number }
  | { type: "SET_TOTAL"; total?: number }
  | { type: "SET_SPREAD"; spread?: number }
  | { type: "LOAD_PICK"; pick: CFBPick; game?: PickFormState["game"] }
  | { type: "RESET" };

const initialState: PickFormState = {
  pickType: "MONEYLINE",
  duration: "FULL",
  double: false,
  game: undefined,
  odds: undefined,
  team: undefined,
  total: undefined,
  spread: undefined,
};

function pickFormReducer(state: PickFormState, action: PickFormAction): PickFormState {
  switch (action.type) {
    case "SET_GAME":
      return { ...state, game: action.game };
    case "SET_PICK_TYPE":
      return { ...state, pickType: action.pickType };
    case "SET_DURATION":
      return { ...state, duration: action.duration };
    case "SET_ODDS":
      return { ...state, odds: action.odds };
    case "SET_DOUBLE":
      return { ...state, double: action.double };
    case "SET_TEAM":
      return { ...state, team: action.team };
    case "SET_TOTAL":
      return { ...state, total: action.total };
    case "SET_SPREAD":
      return { ...state, spread: action.spread };
    case "LOAD_PICK":
      return {
        ...state,
        game: action.game,
        pickType: action.pick.pickType,
        duration: action.pick.duration,
        odds: action.pick.odds,
        double: action.pick.double,
        team: "cfbTeamId" in action.pick ? action.pick.cfbTeamId : undefined,
        total: "total" in action.pick ? action.pick.total : undefined,
        spread: "spread" in action.pick ? action.pick.spread : undefined,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function AddPickDialog(props: {
  pick?: CFBPick;
  week: number;
  ref?: React.Ref<AddPickDialogHandle>;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(pickFormReducer, initialState);

  const clear = () => dispatch({ type: "RESET" });

  useImperativeHandle(props.ref, () => ({ clear }));

  const games = api.cfb.games.useQuery({ week: props.week });

  const picks = api.picks.selfPicks.useQuery({ week: props.week });
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

  useEffect(() => {
    if (props.pick && games.data) {
      const game = games.data.find((g) => g.id === props.pick?.gameId);
      dispatch({ type: "LOAD_PICK", pick: props.pick, game });
    }
  }, [games.data, props.pick]);

  useEffect(() => {
    if (
      state.game &&
      (state.team === undefined ||
        (state.team && ![state.game.homeId, state.game.awayId].includes(state.team)))
    ) {
      dispatch({ type: "SET_TEAM", team: state.game.homeId });
    }
  }, [state.game, state.team]);

  const addPick = () => {
    if (!state.game) return;

    if (!state.odds) {
      console.error("Odds are required.");
      return;
    }

    if (state.pickType === "SPREAD") {
      if (!state.spread) {
        console.error("Spread is required for SPREAD pick type.");
        return;
      }
      if (!state.team) {
        console.error("Team is required for SPREAD pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week,
        gameId: state.game.id,
        pickType: state.pickType,
        duration: state.duration,
        odds: state.odds,
        double: state.double,
        cfbTeamId: state.team,
        spread: state.spread,
      });
    } else if (state.pickType === "MONEYLINE") {
      if (!state.team) {
        console.error("Team is required for MONEYLINE pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week,
        gameId: state.game.id,
        pickType: state.pickType,
        duration: state.duration,
        odds: state.odds,
        double: state.double,
        cfbTeamId: state.team,
      });
    } else if (isTeamTotalPickType(state.pickType)) {
      if (!state.team) {
        console.error("Team is required for team total pick type.");
        return;
      }
      if (!state.total) {
        console.error("Total is required for team total pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week,
        gameId: state.game.id,
        pickType: state.pickType,
        duration: state.duration,
        odds: state.odds,
        double: state.double,
        cfbTeamId: state.team,
        total: state.total,
      });
    } else {
      if (!state.total) {
        console.error("Total is required for over/under pick type.");
        return;
      }
      makePick.mutate({
        id: props.pick?.id,
        teamId: props.pick?.teamId,
        week: props.week,
        gameId: state.game.id,
        pickType: state.pickType,
        duration: state.duration,
        odds: state.odds,
        double: state.double,
        total: state.total,
      });
    }
  };

  const pickTypeSelectItems = pickTypes.map((type) => ({
    value: type,
    display: type.replace(/_/g, " "),
  }));

  const selectedTeamName =
    (state.team === state.game?.awayId ? state.game?.awayTeam : state.game?.homeTeam) ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <DialogHeader className="text-center">
          <DialogTitle>
            {!props.pick ? "Add" : "Edit"} Pick for Week {props.week}
          </DialogTitle>
          <DialogDescription>
            Select a game (that hasn&rsquo;t started) and enter your pick.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Game</Label>
            <GameCombobox
              games={games.data ?? []}
              defaultValue={state.game}
              onChange={(game) => dispatch({ type: "SET_GAME", game })}
            />
          </div>
          {state.game ? (
            <div className="flex flex-wrap justify-evenly gap-4">
              <div className="flex flex-col gap-2">
                <Label>Pick Type</Label>
                <Select
                  items={pickTypeSelectItems}
                  defaultValue={state.pickType}
                  onChange={(pickType) => dispatch({ type: "SET_PICK_TYPE", pickType })}
                  className="w-[130px]"
                />
              </div>
              {state.pickType === "SPREAD" || state.pickType === "MONEYLINE" ? (
                <>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label>Team</Label>
                    <Select
                      items={[state.game.homeTeam, state.game.awayTeam]}
                      defaultValue={selectedTeamName}
                      onChange={(t) =>
                        dispatch({
                          type: "SET_TEAM",
                          team: t === state.game?.homeTeam ? state.game.homeId : state.game?.awayId,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  {state.pickType === "SPREAD" && (
                    <div className="flex flex-col gap-2">
                      <Label>Spread</Label>
                      <Input
                        type="number"
                        placeholder="+/- number"
                        step={0.5}
                        defaultValue={state.spread}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_SPREAD",
                            spread: !e.target.value ? undefined : parseFloat(e.target.value),
                          })
                        }
                        className="w-[130px]"
                      />
                    </div>
                  )}
                </>
              ) : isTeamTotalPickType(state.pickType) ? (
                <>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label>Team</Label>
                    <Select
                      items={[state.game.homeTeam, state.game.awayTeam]}
                      defaultValue={selectedTeamName}
                      onChange={(t) =>
                        dispatch({
                          type: "SET_TEAM",
                          team: t === state.game?.homeTeam ? state.game.homeId : state.game?.awayId,
                        })
                      }
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
                      defaultValue={state.total}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_TOTAL",
                          total: !e.target.value ? undefined : parseFloat(e.target.value),
                        })
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
                    defaultValue={state.total}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_TOTAL",
                        total: !e.target.value ? undefined : parseFloat(e.target.value),
                      })
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
              <Select
                items={durations}
                defaultValue={state.duration}
                onChange={(duration) => dispatch({ type: "SET_DURATION", duration })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="odds">Odds</Label>
              <Input
                id="odds"
                type="number"
                placeholder="+/- number"
                step={10}
                defaultValue={state.odds}
                onChange={(e) =>
                  dispatch({
                    type: "SET_ODDS",
                    odds: !e.target.value ? undefined : parseFloat(e.target.value),
                  })
                }
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
                      defaultChecked={state.double}
                      onCheckedChange={(double) => dispatch({ type: "SET_DOUBLE", double })}
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
