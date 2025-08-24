import { useMemo, useRef, useState } from "react";
import { AddPickDialog, type AddPickDialogHandle } from "~/components/add-pick-dialog";
import { PickCard } from "~/components/pick-card";
import { Select } from "~/components/select";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import type { Week } from "~/server/api/routers/cfb";
import type { Pick } from "~/server/api/routers/picks";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

export default function Home() {
  const [week, setWeek] = useState<Week | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);

  const calendar = api.cfb.calendar.useQuery(
    {},
    {
      select: (data) => {
        const current = data.find((week) => week.endDate >= new Date()) ?? data[data.length - 1];

        if (current && currentWeek !== current) {
          setWeek(current);
          setCurrentWeek(current);
        }

        return data;
      },
    },
  );

  const weeksBySeasonType = useMemo(
    () =>
      calendar.data?.reduce(
        (acc, week) => {
          const group = week.seasonType === "regular" ? "Regular Season" : "Playoffs";
          acc[group] ??= [];
          acc[group].push(`Week ${week.week}`);
          return acc;
        },
        {} as Record<"Regular Season" | "Playoffs", `Week ${number}`[]>,
      ),
    [calendar.data],
  );

  const picks = api.picks.teamPicks.useQuery(
    {
      season: week?.season,
      week: week?.week,
    },
    {
      enabled: !!week,
    },
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      <div className="sticky top-2 flex w-full items-center gap-4">
        {weeksBySeasonType ? (
          <Select
            items={weeksBySeasonType}
            defaultValue={`${currentWeek!.seasonType === "regular" ? "Regular Season" : "Playoffs"}-Week ${currentWeek!.week}`}
            onChange={(v) => {
              const [seasonType, display] = v.split("-") as [
                keyof typeof weeksBySeasonType,
                `Week ${number}`,
              ];
              const weekNum = parseInt(display.replace("Week ", ""));
              const selectedWeek = calendar.data!.find(
                (w) =>
                  w.seasonType === (seasonType === "Regular Season" ? "regular" : "postseason") &&
                  w.week === weekNum,
              )!;
              setWeek(selectedWeek);
            }}
            className="bg-accent text-accent-foreground flex-1"
          />
        ) : (
          <Skeleton className="h-10 flex-1 rounded" />
        )}
        {week && <AddPickButton week={week} disabled={!picks.data || picks.data.length >= 5} />}
      </div>
      {week && picks.data && <PickList picks={picks.data} week={week} />}
    </div>
  );
}

function AddPickButton(props: { week: Week; disabled: boolean }) {
  const dialogRef = useRef<AddPickDialogHandle>(null);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <AddPickDialog week={props.week} ref={dialogRef}>
              <Button disabled={props.disabled} onClick={dialogRef.current?.clear}>
                Add Pick
              </Button>
            </AddPickDialog>
          </div>
        </TooltipTrigger>
        {props.disabled && (
          <TooltipContent side="left" className="bg-accent">
            <p className="text-accent-foreground text-sm">Max 5 picks per week</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function PickList(props: { picks: Pick[]; week: Week }) {
  return (
    <div className="w-full">
      {props.picks.length === 0 ? (
        <p className="text-center">No picks found for this week.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {props.picks.map((pick, i) => (
            <li key={pick.id}>
              <PickCard pick={pick} num={i} week={props.week} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const getServerSideProps = withSession();
