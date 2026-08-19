import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { useSession } from "next-auth/react";

import type { RouterOutputs } from "~/utils/api";
import { Select } from "~/components/select";
import { formatUnits, StatsLineChart } from "~/components/stats-line-chart";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

type TeamStats = RouterOutputs["picks"]["stats"]["teams"][number];
type SortKey = "rank" | "name" | "record" | "winRate" | "net1u" | "netWager" | "unitsPerPick";
type BreakdownKey = keyof TeamStats["breakdowns"];

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRecord(summary: TeamStats["summary"]) {
  return `${summary.wins}-${summary.losses}-${summary.pushes}`;
}

function sortValue(team: TeamStats, key: SortKey) {
  if (key === "rank") return team.rank;
  if (key === "name") return team.name;
  if (key === "record") return team.summary.wins;
  return team.summary[key];
}

function Leaderboard(props: { teams: TeamStats[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [ascending, setAscending] = useState(true);
  const sortedTeams = useMemo(
    () =>
      [...props.teams].sort((a, b) => {
        const aValue = sortValue(a, sortKey);
        const bValue = sortValue(b, sortKey);
        const result =
          typeof aValue === "string"
            ? aValue.localeCompare(String(bValue))
            : aValue - Number(bValue);
        return ascending ? result : -result;
      }),
    [ascending, props.teams, sortKey],
  );

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setAscending((value) => !value);
      return;
    }

    setSortKey(key);
    setAscending(key === "rank" || key === "name");
  };

  return (
    <Card className="w-full gap-4">
      <CardHeader>
        <CardTitle className="text-primary-foreground">Leaderboard</CardTitle>
        <CardDescription>Official rank is based on net 1u results</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left">
              <tr>
                <SortableHeading
                  label="Rank"
                  sortKey="rank"
                  activeKey={sortKey}
                  ascending={ascending}
                  onSort={changeSort}
                />
                <SortableHeading
                  label="Team"
                  sortKey="name"
                  activeKey={sortKey}
                  ascending={ascending}
                  onSort={changeSort}
                />
                <SortableHeading
                  label="W-L-P"
                  sortKey="record"
                  activeKey={sortKey}
                  ascending={ascending}
                  onSort={changeSort}
                />
                <SortableHeading
                  label="Win %"
                  sortKey="winRate"
                  activeKey={sortKey}
                  ascending={ascending}
                  onSort={changeSort}
                />
                <SortableHeading
                  label="Net 1u"
                  sortKey="net1u"
                  activeKey={sortKey}
                  ascending={ascending}
                  onSort={changeSort}
                />
                <SortableHeading
                  label="Net wager"
                  sortKey="netWager"
                  activeKey={sortKey}
                  ascending={ascending}
                  onSort={changeSort}
                />
                <SortableHeading
                  label="Units/pick"
                  sortKey="unitsPerPick"
                  activeKey={sortKey}
                  ascending={ascending}
                  onSort={changeSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team) => (
                <tr key={team.id} className="border-b last:border-0">
                  <td className="px-2 py-3 text-center text-lg font-semibold">{team.rank}</td>
                  <td className="px-2 py-3">
                    <Link
                      href={{ pathname: "/board", query: { view: "team", teamId: team.id } }}
                      className="text-primary-foreground font-medium hover:underline"
                    >
                      {team.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {team.users.map((user) => user.name).join(", ")}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums">
                    {formatRecord(team.summary)}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">
                    {formatPercent(team.summary.winRate)}
                  </td>
                  <td className="px-2 py-3 text-right font-medium tabular-nums">
                    {formatUnits(team.summary.net1u)}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">
                    {formatUnits(team.summary.netWager)}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">
                    {formatUnits(team.summary.unitsPerPick)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ol className="space-y-3 md:hidden">
          {sortedTeams.map((team) => (
            <li key={team.id} className="bg-accent/40 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="text-primary-foreground text-2xl font-semibold">
                    #{team.rank}
                  </span>
                  <div>
                    <Link
                      href={{ pathname: "/board", query: { view: "team", teamId: team.id } }}
                      className="text-primary-foreground font-semibold hover:underline"
                    >
                      {team.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {team.users.map((user) => user.name).join(", ")}
                    </p>
                  </div>
                </div>
                <span className="font-semibold tabular-nums">
                  {formatUnits(team.summary.net1u)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Record</dt>
                  <dd>{formatRecord(team.summary)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Win rate</dt>
                  <dd>{formatPercent(team.summary.winRate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Units/pick</dt>
                  <dd>{formatUnits(team.summary.unitsPerPick)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function SortableHeading(props: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  ascending: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th
      className="px-2 py-2 first:text-center [&:nth-child(n+3)]:text-right"
      aria-sort={
        props.activeKey === props.sortKey ? (props.ascending ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => props.onSort(props.sortKey)}
      >
        {props.label}
        <ArrowUpDown className="size-3" aria-hidden="true" />
      </button>
    </th>
  );
}

function TeamAnalysis(props: { teams: TeamStats[] }) {
  const session = useSession();
  const [selectedTeamId, setSelectedTeamId] = useState<number>();
  const [breakdownKey, setBreakdownKey] = useState<BreakdownKey>("pickType");
  const team =
    props.teams.find((entry) => entry.id === selectedTeamId) ??
    props.teams.find((entry) => entry.id === session.data?.user.teamId) ??
    props.teams[0];

  if (!team) return null;

  const labels: Record<BreakdownKey, string> = {
    pickType: "Pick type",
    duration: "Duration",
    stake: "Stake",
  };

  return (
    <Card className="w-full gap-4">
      <CardHeader>
        <CardTitle className="text-primary-foreground">Team analysis</CardTitle>
        <CardDescription>Find where each team performs best</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Select
          items={props.teams.map((entry) => ({ value: entry.id.toString(), display: entry.name }))}
          value={team.id.toString()}
          onChange={(value) => setSelectedTeamId(Number(value))}
          ariaLabel="Team to analyze"
          className="bg-accent text-accent-foreground w-full"
        />
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <SummaryItem
            label="Current streak"
            value={
              team.summary.currentStreak.result
                ? `${team.summary.currentStreak.count}${team.summary.currentStreak.result}`
                : "—"
            }
          />
          <SummaryItem
            label="Best week"
            value={
              team.summary.bestWeek
                ? `W${team.summary.bestWeek.week} · ${formatUnits(team.summary.bestWeek.net1u)}`
                : "—"
            }
          />
          <SummaryItem
            label="Worst week"
            value={
              team.summary.worstWeek
                ? `W${team.summary.worstWeek.week} · ${formatUnits(team.summary.worstWeek.net1u)}`
                : "—"
            }
          />
        </dl>
        <div className="bg-muted grid grid-cols-3 rounded-lg p-1" aria-label="Breakdown type">
          {(Object.keys(labels) as BreakdownKey[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={breakdownKey === key ? "secondary" : "ghost"}
              aria-pressed={breakdownKey === key}
              onClick={() => setBreakdownKey(key)}
            >
              {labels[key]}
            </Button>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left">
              <tr>
                <th className="py-2">Group</th>
                <th className="py-2 text-right">Picks</th>
                <th className="py-2 text-right">W-L-P</th>
                <th className="py-2 text-right">Win %</th>
                <th className="py-2 text-right">Net 1u</th>
                <th className="py-2 text-right">Units/pick</th>
              </tr>
            </thead>
            <tbody>
              {team.breakdowns[breakdownKey].map((row) => (
                <tr key={row.key} className="border-b last:border-0">
                  <td className="py-3 font-medium">{row.key.replaceAll("_", " ")}</td>
                  <td className="py-3 text-right tabular-nums">{row.total}</td>
                  <td className="py-3 text-right tabular-nums">
                    {row.wins}-{row.losses}-{row.pushes}
                  </td>
                  <td className="py-3 text-right tabular-nums">{formatPercent(row.winRate)}</td>
                  <td className="py-3 text-right tabular-nums">{formatUnits(row.net1u)}</td>
                  <td className="py-3 text-right tabular-nums">{formatUnits(row.unitsPerPick)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y sm:hidden">
          {team.breakdowns[breakdownKey].map((row) => (
            <li key={row.key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{row.key.replaceAll("_", " ")}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {row.total} {row.total === 1 ? "pick" : "picks"}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <BreakdownItem label="Record" value={`${row.wins}-${row.losses}-${row.pushes}`} />
                <BreakdownItem label="Win rate" value={formatPercent(row.winRate)} />
                <BreakdownItem label="Net 1u" value={formatUnits(row.net1u)} />
                <BreakdownItem label="Units/pick" value={formatUnits(row.unitsPerPick)} />
              </dl>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function BreakdownItem(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{props.label}</dt>
      <dd className="tabular-nums">{props.value}</dd>
    </div>
  );
}

function SummaryItem(props: { label: string; value: string }) {
  return (
    <div className="bg-accent/40 rounded-lg p-3 text-center">
      <dt className="text-muted-foreground text-xs">{props.label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{props.value}</dd>
    </div>
  );
}

export default function Stats() {
  const stats = api.picks.stats.useQuery();

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-4">
      <div className="w-full">
        <h1 className="text-2xl font-semibold">Season stats</h1>
        <p className="text-muted-foreground text-sm">Leaderboard, trends, and team strengths</p>
      </div>
      {stats.isLoading ? (
        <>
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-[444px] w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </>
      ) : stats.isError ? (
        <Card className="w-full">
          <CardContent>
            <p className="text-destructive text-center text-sm">Unable to load team stats.</p>
          </CardContent>
        </Card>
      ) : stats.data ? (
        <>
          <Leaderboard teams={stats.data.teams} />
          <StatsLineChart teams={stats.data.teams} />
          <TeamAnalysis teams={stats.data.teams} />
        </>
      ) : null}
    </div>
  );
}

export const getServerSideProps = withSession();
