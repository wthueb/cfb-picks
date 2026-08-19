import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { useSession } from "next-auth/react";

import { getGameLockDate, isGameLocked } from "@cfb-picks/lib/dates";

import { AddPickDialog } from "~/components/add-pick-dialog";
import { PickList } from "~/components/pick-list";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { WeekSelect } from "~/components/week-select";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

export default function Home() {
  const [week, setWeek] = useState<number>();
  const [now, setNow] = useState(() => new Date());
  const session = useSession();

  const calendar = api.cfb.calendar.useQuery();
  const games = api.cfb.games.useQuery({ week }, { enabled: !!week });

  const picks = api.picks.selfPicks.useQuery(
    { week: week },
    { enabled: !!week, refetchInterval: 1000 * 30 },
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const nextLock = useMemo(
    () =>
      games.data
        ?.map((game) => getGameLockDate(game.startDate))
        .filter((lockDate) => lockDate > now)
        .sort((a, b) => a.getTime() - b.getTime())[0],
    [games.data, now],
  );
  const noEligibleGames =
    !!games.data &&
    (games.data.length === 0 ||
      (!session.data?.user.isAdmin &&
        games.data.every((game) => isGameLocked(game.startDate, now))));
  const disabledReason = picks.isLoading
    ? "Loading this week's picks"
    : picks.data && picks.data.length >= 5
      ? "Maximum of five picks reached"
      : games.isLoading
        ? "Loading eligible games"
        : noEligibleGames
          ? "No eligible games remain this week"
          : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      <div className="bg-background/95 sticky top-0 z-10 flex w-full items-center gap-4 py-2 backdrop-blur">
        <WeekSelect
          weeks={calendar.data}
          defaultType="current"
          selectedWeek={week}
          onChange={(w) => setWeek(w.week)}
          className="bg-accent text-accent-foreground flex-1"
          ariaLabel="Pick week"
        />
        {week && <AddPickButton week={week} disabledReason={disabledReason} />}
      </div>
      {week && (
        <Card className="w-full gap-0 py-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{picks.data?.length ?? 0} of 5 picks</p>
              <p className="text-muted-foreground">
                {picks.data?.some((pick) => pick.double)
                  ? "Double pick used"
                  : "Double pick available"}
              </p>
            </div>
            <p className="text-muted-foreground text-right">
              {session.data?.user.isAdmin
                ? "Admin editing enabled"
                : nextLock
                  ? `Next lock in ${formatDistanceToNowStrict(nextLock, { addSuffix: false })}`
                  : "No upcoming lock times"}
            </p>
          </CardContent>
        </Card>
      )}
      {week && picks.data && <PickList picks={picks.data} />}
    </div>
  );
}

function AddPickButton(props: { week: number; disabledReason?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <AddPickDialog week={props.week}>
            <Button disabled={!!props.disabledReason}>Add Pick</Button>
          </AddPickDialog>
        </div>
      </TooltipTrigger>
      {props.disabledReason && (
        <TooltipContent side="left" className="bg-accent">
          <p className="text-accent-foreground text-sm">{props.disabledReason}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export const getServerSideProps = withSession();
