import { useEffect, useId, useReducer, useState } from "react";

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
  pickType: "SPREAD",
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

export function AddPickDialog(props: { pick?: CFBPick; week: number; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(pickFormReducer, initialState);
  const formId = useId();

  const clear = () => dispatch({ type: "RESET" });

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

  const marketComplete =
    state.pickType === "SPREAD"
      ? state.team !== undefined && state.spread !== undefined
      : state.pickType === "MONEYLINE"
        ? state.team !== undefined
        : isTeamTotalPickType(state.pickType)
          ? state.team !== undefined && state.total !== undefined
          : state.total !== undefined;
  const canSave =
    state.game !== undefined && state.odds !== undefined && state.odds !== 0 && marketComplete;

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

    if (state.odds === undefined || state.odds === 0) return;

    if (state.pickType === "SPREAD") {
      if (state.spread === undefined || state.team === undefined) return;
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
      if (state.team === undefined) return;
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
      if (state.team === undefined || state.total === undefined) return;
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
      if (state.total === undefined) return;
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

  const pickTypeSelectItems = pickTypes
    .filter((type) => type !== "MONEYLINE" || props.pick?.pickType === "MONEYLINE")
    .map((type) => ({
      value: type,
      display: type.replace(/_/g, " "),
    }));

  const selectedTeamName =
    (state.team === state.game?.awayId ? state.game?.awayTeam : state.game?.homeTeam) ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          makePick.reset();
          if (!props.pick) clear();
        }
      }}
    >
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
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
            <Label htmlFor={`${formId}-game`}>Game</Label>
            <GameCombobox
              id={`${formId}-game`}
              ariaLabel="Game"
              games={games.data ?? []}
              value={state.game}
              onChange={(game) => dispatch({ type: "SET_GAME", game })}
            />
          </div>
          {state.game ? (
            <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-[8rem_minmax(0,1fr)_8rem]">
              <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-2">
                <Label htmlFor={`${formId}-pick-type`}>Pick Type</Label>
                <Select
                  id={`${formId}-pick-type`}
                  ariaLabel="Pick type"
                  items={pickTypeSelectItems}
                  value={state.pickType}
                  onChange={(pickType) => dispatch({ type: "SET_PICK_TYPE", pickType })}
                  className="w-full min-w-0"
                />
              </div>
              {state.pickType === "SPREAD" || state.pickType === "MONEYLINE" ? (
                <>
                  <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-col gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                    <Label htmlFor={`${formId}-team`}>Team</Label>
                    <Select
                      id={`${formId}-team`}
                      ariaLabel="Team"
                      items={[state.game.homeTeam, state.game.awayTeam]}
                      value={selectedTeamName}
                      onChange={(t) =>
                        dispatch({
                          type: "SET_TEAM",
                          team: t === state.game?.homeTeam ? state.game.homeId : state.game?.awayId,
                        })
                      }
                      className="w-full min-w-0"
                    />
                  </div>
                  {state.pickType === "SPREAD" && (
                    <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-2 sm:col-start-3">
                      <Label htmlFor={`${formId}-spread`}>Spread</Label>
                      <Input
                        id={`${formId}-spread`}
                        type="number"
                        placeholder="+/- number"
                        step={0.5}
                        value={state.spread ?? ""}
                        aria-invalid={state.spread === undefined}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_SPREAD",
                            spread: !e.target.value ? undefined : parseFloat(e.target.value),
                          })
                        }
                        className="w-full min-w-0"
                      />
                    </div>
                  )}
                </>
              ) : isTeamTotalPickType(state.pickType) ? (
                <>
                  <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-col gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                    <Label htmlFor={`${formId}-team`}>Team</Label>
                    <Select
                      id={`${formId}-team`}
                      ariaLabel="Team"
                      items={[state.game.homeTeam, state.game.awayTeam]}
                      value={selectedTeamName}
                      onChange={(t) =>
                        dispatch({
                          type: "SET_TEAM",
                          team: t === state.game?.homeTeam ? state.game.homeId : state.game?.awayId,
                        })
                      }
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-2 sm:col-start-3">
                    <Label htmlFor={`${formId}-total`}>Total</Label>
                    <Input
                      id={`${formId}-total`}
                      type="number"
                      placeholder="number"
                      min={0}
                      step={0.5}
                      value={state.total ?? ""}
                      aria-invalid={state.total === undefined}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_TOTAL",
                          total: !e.target.value ? undefined : parseFloat(e.target.value),
                        })
                      }
                      className="w-full min-w-0"
                    />
                  </div>
                </>
              ) : (
                <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-2 sm:col-span-2 sm:col-start-2">
                  <Label htmlFor={`${formId}-total`}>Total</Label>
                  <Input
                    id={`${formId}-total`}
                    type="number"
                    placeholder="number"
                    min={0}
                    step={0.5}
                    value={state.total ?? ""}
                    aria-invalid={state.total === undefined}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_TOTAL",
                        total: !e.target.value ? undefined : parseFloat(e.target.value),
                      })
                    }
                    className="w-full min-w-0"
                  />
                </div>
              )}
            </div>
          ) : (
            <Skeleton className="h-16.5 w-full" />
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`${formId}-duration`}>Duration</Label>
              <Select
                id={`${formId}-duration`}
                ariaLabel="Duration"
                items={durations}
                value={state.duration}
                onChange={(duration) => dispatch({ type: "SET_DURATION", duration })}
                className="w-full min-w-0"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`${formId}-odds`}>Odds</Label>
              <Input
                id={`${formId}-odds`}
                type="number"
                placeholder="+/- number"
                step={10}
                value={state.odds ?? ""}
                aria-invalid={
                  state.game !== undefined && (state.odds === undefined || state.odds === 0)
                }
                onChange={(e) =>
                  dispatch({
                    type: "SET_ODDS",
                    odds: !e.target.value ? undefined : parseFloat(e.target.value),
                  })
                }
                className="w-full min-w-0"
              />
            </div>
            <div className="flex h-full flex-col gap-2">
              <Label htmlFor={`${formId}-double`}>Double</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex grow items-center">
                    <Switch
                      id={`${formId}-double`}
                      disabled={!canDouble}
                      checked={state.double}
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
        <div className="min-h-5">
          {makePick.isError && (
            <p className="text-destructive text-sm" role="alert">
              {makePick.error.message || "Unable to save this pick."}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={addPick} disabled={!canSave || makePick.isPending}>
            {makePick.isPending ? "Saving..." : "Save Pick"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
