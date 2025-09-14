import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PickList } from "~/components/pick-list";
import { Select } from "~/components/select";
import { Skeleton } from "~/components/ui/skeleton";
import { WeekSelect } from "~/components/week-select";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

export default function Picks() {
  const searchParams = useSearchParams();

  const [teamId, setTeamId] = useState<number>();
  const [week, setWeek] = useState<number>();

  const teams = api.picks.teams.useQuery(undefined, { refetchInterval: 1000 * 30 });
  const calendar = api.cfb.calendar.useQuery();

  const weeks = calendar.data?.filter(
    (w) => teams.data?.flatMap((t) => t.picks.map((p) => p.week)).includes(w.week) ?? false,
  );

  const teamIdSet = useRef(false);

  useEffect(() => {
    if (!teams.data || teamIdSet.current) return;

    const teamIdParam = searchParams.get("teamId");
    if (teamIdParam) {
      const id = parseInt(teamIdParam);
      setTeamId(id);
    } else {
      setTeamId(teams.data[0]?.id);
    }

    teamIdSet.current = true;
  }, [teams.data, searchParams]);

  const team = teams.data?.find((t) => t.id === teamId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      <div className="sticky top-2 flex w-full items-center gap-4">
        <WeekSelect
          weeks={weeks}
          defaultType="last"
          onChange={(w) => setWeek(w.week)}
          className="bg-accent text-accent-foreground flex-1"
        />
        {teams.data && teamId ? (
          <Select
            items={teams.data.map((t) => ({
              value: t.id.toString(),
              display: t.name,
            }))}
            defaultValue={teamId.toString()}
            onChange={(v) => {
              const teamId = parseInt(v);
              setTeamId(teamId);
            }}
            className="bg-accent text-accent-foreground flex-1"
          />
        ) : (
          <Skeleton className="h-9 w-full" />
        )}
      </div>
      {team && week && <PickList picks={team.picks.filter((p) => p.week === week)} />}
    </div>
  );
}

export const getServerSideProps = withSession();
