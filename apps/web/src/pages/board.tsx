import { useEffect } from "react";
import { useRouter } from "next/router";
import { LayoutList, Users } from "lucide-react";
import { useSession } from "next-auth/react";

import type { RouterOutputs } from "~/utils/api";
import { formatPick, PickCard } from "~/components/pick-card";
import { Select } from "~/components/select";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { WeekSelect } from "~/components/week-select";
import { cn } from "~/lib/utils";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

type BoardData = RouterOutputs["picks"]["weeklyBoard"];
type BoardView = "game" | "team";
type Insight = BoardData["games"][number]["picks"][number]["insight"];

function queryNumber(value: string | string[] | undefined) {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function Board() {
  const router = useRouter();
  const session = useSession();
  const requestedWeek = queryNumber(router.query.week);
  const requestedTeamId = queryNumber(router.query.teamId);
  const view: BoardView = router.query.view === "team" || requestedTeamId ? "team" : "game";
  const calendar = api.cfb.calendar.useQuery();
  const board = api.picks.weeklyBoard.useQuery(
    { week: requestedWeek },
    { refetchInterval: 1000 * 30 },
  );
  const activeWeek = requestedWeek ?? board.data?.week;
  const selectedTeam =
    board.data?.teams.find((team) => team.id === requestedTeamId) ??
    board.data?.teams.find((team) => team.id === session.data?.user.teamId) ??
    board.data?.teams[0];

  useEffect(() => {
    if (!router.isReady || requestedWeek || !board.data?.week) return;

    void router.replace(
      {
        pathname: "/board",
        query: {
          week: board.data.week,
          view,
          ...(requestedTeamId ? { teamId: requestedTeamId } : {}),
        },
      },
      undefined,
      { shallow: true },
    );
  }, [board.data?.week, requestedTeamId, requestedWeek, router, view]);

  const updateQuery = (changes: { week?: number; view?: BoardView; teamId?: number }) => {
    const nextView = changes.view ?? view;
    const nextTeamId = changes.teamId ?? (nextView === "team" ? selectedTeam?.id : undefined);

    void router.replace(
      {
        pathname: "/board",
        query: {
          week: changes.week ?? activeWeek,
          view: nextView,
          ...(nextTeamId ? { teamId: nextTeamId } : {}),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold">Weekly board</h1>
        <p className="text-muted-foreground text-sm">
          Compare selections as each game reaches its lock time
        </p>
      </div>
      <div className="bg-background/95 sticky top-0 z-10 flex flex-col gap-3 py-2 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row">
          {activeWeek ? (
            <WeekSelect
              weeks={calendar.data}
              defaultType="last"
              selectedWeek={activeWeek}
              onChange={(week) => updateQuery({ week: week.week })}
              ariaLabel="Board week"
              className="bg-accent text-accent-foreground w-full min-w-40 flex-1"
            />
          ) : (
            <Skeleton className="h-9 min-w-40 flex-1" />
          )}
          <div className="bg-muted flex self-start rounded-md p-1" aria-label="Board view">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "text-muted-foreground",
                view === "game" &&
                  "bg-background text-foreground ring-border hover:bg-background shadow-sm ring-1",
              )}
              aria-pressed={view === "game"}
              onClick={() => updateQuery({ view: "game" })}
            >
              <LayoutList aria-hidden="true" />
              By game
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "text-muted-foreground",
                view === "team" &&
                  "bg-background text-foreground ring-border hover:bg-background shadow-sm ring-1",
              )}
              aria-pressed={view === "team"}
              onClick={() => updateQuery({ view: "team" })}
            >
              <Users aria-hidden="true" />
              By team
            </Button>
          </div>
        </div>
        {view === "team" && selectedTeam && board.data && (
          <Select
            items={board.data.teams.map((team) => ({
              value: team.id.toString(),
              display: team.name,
            }))}
            value={selectedTeam.id.toString()}
            onChange={(teamId) => updateQuery({ teamId: Number(teamId), view: "team" })}
            ariaLabel="Board team"
            className="bg-accent text-accent-foreground w-full min-w-48"
          />
        )}
      </div>
      {board.isLoading ? (
        <>
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </>
      ) : board.isError ? (
        <Card>
          <CardContent>
            <p className="text-destructive text-center text-sm">Unable to load the weekly board.</p>
          </CardContent>
        </Card>
      ) : board.data ? (
        <>
          {!board.data.allGamesLocked && (
            <p className="bg-accent/50 text-muted-foreground rounded-lg border px-4 py-3 text-sm">
              This is a partial reveal. Your picks remain visible to you; other selections appear as
              their games lock.
            </p>
          )}
          {view === "game" ? (
            <GameBoard
              data={board.data}
              onSelectTeam={(teamId) => updateQuery({ view: "team", teamId })}
            />
          ) : selectedTeam ? (
            <TeamBoard team={selectedTeam} />
          ) : (
            <EmptyBoard />
          )}
        </>
      ) : null}
    </div>
  );
}

function GameBoard(props: { data: BoardData; onSelectTeam: (teamId: number) => void }) {
  if (props.data.games.length === 0) return <EmptyBoard />;

  return (
    <div className="space-y-4">
      {props.data.games.map(({ game, picks }) => (
        <Card key={game.id} className="gap-4">
          <CardHeader>
            <CardTitle className="text-primary-foreground">
              {game.awayTeam} @ {game.homeTeam}
            </CardTitle>
            <CardDescription>
              {game.startDate.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {game.completed && ` · Final ${game.awayPoints}-${game.homePoints}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {picks.map((entry) => {
                const pick = { ...entry.pick, game };
                return (
                  <li
                    key={entry.pick.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <button
                        type="button"
                        className="text-primary-foreground font-medium hover:underline"
                        onClick={() => props.onSelectTeam(entry.team.id)}
                      >
                        {entry.team.name}
                      </button>
                      <p className="text-sm">{formatPick(pick)}</p>
                    </div>
                    <InsightBadge insight={entry.insight} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TeamBoard(props: { team: BoardData["teams"][number] }) {
  return (
    <div className="space-y-4">
      <Card className="gap-2 py-4">
        <CardHeader>
          <CardTitle className="text-primary-foreground">{props.team.name}</CardTitle>
          <CardDescription>{props.team.users.map((user) => user.name).join(", ")}</CardDescription>
        </CardHeader>
      </Card>
      {props.team.picks.length === 0 ? (
        <EmptyBoard />
      ) : (
        <ul className="space-y-4">
          {props.team.picks.map((entry, index) => (
            <li key={entry.pick.id} className="space-y-2">
              <div className="flex justify-end">
                <InsightBadge insight={entry.insight} />
              </div>
              <PickCard pick={{ ...entry.pick, game: entry.game }} num={index} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InsightBadge(props: { insight: Insight }) {
  const labels: Record<Insight, string> = {
    consensus: "Consensus",
    conflict: "Conflict",
    unique: "Unique",
    pending: "Pending reveal",
  };

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-xs font-medium",
        props.insight === "consensus" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        props.insight === "conflict" && "border-amber-500/40 bg-amber-500/10 text-amber-300",
        props.insight === "unique" && "border-blue-500/40 bg-blue-500/10 text-blue-300",
        props.insight === "pending" && "text-muted-foreground bg-muted",
      )}
    >
      {labels[props.insight]}
    </span>
  );
}

function EmptyBoard() {
  return (
    <Card>
      <CardContent>
        <p className="text-muted-foreground text-center text-sm">
          No picks are available in this view yet.
        </p>
      </CardContent>
    </Card>
  );
}

export const getServerSideProps = withSession();
