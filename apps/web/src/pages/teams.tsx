import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { PickList } from "~/components/pick-list";
import { Select } from "~/components/select";
import { Skeleton } from "~/components/ui/skeleton";
import { WeekSelect } from "~/components/week-select";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

export default function Picks() {
  const searchParams = useSearchParams();

  const [selectedTeamId, setSelectedTeamId] = useState<number>();
  const [week, setWeek] = useState<number>();

  const teams = api.picks.teams.useQuery(undefined, { refetchInterval: 1000 * 30 });
  const calendar = api.cfb.calendar.useQuery();

  const weeks = calendar.data?.filter(
    (w) => teams.data?.flatMap((t) => t.picks.map((p) => p.week)).includes(w.week) ?? false,
  );

  const teamIdParam = searchParams.get("teamId");
  const requestedTeamId = teamIdParam ? parseInt(teamIdParam) : undefined;
  const teamId = selectedTeamId ?? requestedTeamId ?? teams.data?.[0]?.id;

  const hasPicks = teams.data?.some((team) => team.picks.length > 0);
  const team = teams.data?.find((t) => t.id === teamId);

  if (hasPicks === false) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-2">
        <p className="text-center">No picks made yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      <div className="sticky top-2 flex w-full items-center gap-4">
        <WeekSelect
          weeks={weeks}
          defaultType="last"
          selectedWeek={week}
          onChange={(w) => setWeek(w.week)}
          className="bg-accent text-accent-foreground flex-1"
        />
        {teams.data && teamId ? (
          <Select
            items={teams.data.map((t) => ({
              value: t.id.toString(),
              display: t.name,
            }))}
            value={teamId.toString()}
            onChange={(v) => {
              const teamId = parseInt(v);
              setSelectedTeamId(teamId);
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
