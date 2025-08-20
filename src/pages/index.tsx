import { useState } from "react";
import { GameCombobox } from "~/components/game-combobox";
import { PickTypeSelect } from "~/components/pick-type-select";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { WeekSelect, type Week } from "~/components/week-select";
import type { Pick } from "~/server/api/routers/picks";
import { api } from "~/utils/api";

function PickItem(props: { pick: Pick }) {
  return (
    <div className="flex justify-between rounded-md border p-2">
      {props.pick.pickType === "SPREAD"
        ? "spread"
        : props.pick.pickType.endsWith("_TT")
          ? "team total"
          : props.pick.pickType.endsWith("_OVER") || props.pick.pickType.endsWith("_UNDER")
            ? "over/under"
            : null}
    </div>
  );
}

export default function Home() {
  const [week, setWeek] = useState<Week>();

  const picks = api.picks.selfPicks.useQuery(
    {
      season: week?.season ?? 2025,
      week: week?.week,
    },
    {
      enabled: !!week,
    },
  );

  const games = api.cfb.games.useQuery(
    { year: week?.season ?? 2025, week: week?.week, seasonType: week?.seasonType },
    {
      enabled: !!week,
      select: (data) => {
        const now = new Date();
        return data.filter((game) => game.startDate > now);
      },
    },
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 p-4">
      <Dialog>
        <div className="flex w-full items-center gap-4">
          <WeekSelect onChange={setWeek} className="flex-grow" />
          <DialogTrigger asChild>
            <Button disabled={picks.data && picks.data.length >= 5}>Add Pick</Button>
          </DialogTrigger>
        </div>
        {picks.data && (
          <div className="w-full">
            {picks.data.length === 0 ? (
              <p className="text-center">No picks found for this week.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {picks.data.map((res) => (
                  <li key={res.pick.id}>
                    <PickItem pick={res.pick} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <form>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Pick</DialogTitle>
              <DialogDescription>
                Select a game (that hasn&rsquo;t started) and enter your pick.
              </DialogDescription>
            </DialogHeader>
            <Label>Game</Label>
            <GameCombobox games={games.data ?? []} onChange={(v) => console.log(v)} />
            <Label>Pick Type</Label>
            <PickTypeSelect onChange={(v) => console.log(v)} className="w-[130px]" />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              {/* TODO: disable button */}
              <Button type="submit">Save Pick</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
      {/*games.data && (
        <div className="w-full max-w-3xl">
          {games.data.length === 0 ? (
            <p>No games found for this week.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {games.data.map((game) => (
                <li
                  key={game.id}
                  className="hover:bg-accent flex justify-between rounded-md border p-2"
                >
                  <span>
                    {game.awayTeam} at {game.homeTeam}
                  </span>
                  <span>{game.startDate.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )*/}
    </div>
  );
}
