import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PickList } from "~/components/pick-list";
import { Select } from "~/components/select";
import { Skeleton } from "~/components/ui/skeleton";
import { WeekSelect } from "~/components/week-select";
import type { Week } from "~/server/api/routers/cfb";
import { withSession } from "~/server/auth";
import { api, type RouterOutputs } from "~/utils/api";

export default function Picks() {
  const searchParams = useSearchParams();

  const [team, setTeam] = useState<RouterOutputs["picks"]["teams"][number]>();
  const [week, setWeek] = useState<Week>();

  const teams = api.picks.teams.useQuery();
  const calendar = api.cfb.calendar.useQuery();

  const weeks = calendar.data?.filter(
    (w) => teams.data?.flatMap((t) => t.picks.map((p) => p.week)).includes(w.week) ?? false,
  );

  useEffect(() => {
    if (!teams.data) return;

    const teamIdString = searchParams.get("teamId");
    if (teamIdString) {
      const teamId = parseInt(teamIdString);
      const team = teams.data.find((t) => t.id === teamId);
      setTeam(team);
    } else {
      setTeam(teams.data[0]);
    }
  }, [searchParams, teams.data]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      <div className="sticky top-2 flex w-full items-center gap-4">
        <WeekSelect
          weeks={weeks}
          defaultType="last"
          onChange={setWeek}
          className="bg-accent text-accent-foreground flex-1"
        />
        {teams.data && team ? (
          <Select
            items={teams.data.map((t) => ({ value: t.id.toString(), display: t.name }))}
            defaultValue={team.id.toString()}
            onChange={(v) => {
              const teamId = parseInt(v);
              const team = teams.data.find((t) => t.id === teamId)!;
              setTeam(team);
            }}
            className="bg-accent text-accent-foreground flex-1"
          />
        ) : (
          <Skeleton className="h-9 w-full" />
        )}
      </div>
      {team && week && (
        <PickList picks={team.picks.filter((p) => p.week === week.week)} week={week} />
      )}
    </div>
  );
}

export const getServerSideProps = withSession();
