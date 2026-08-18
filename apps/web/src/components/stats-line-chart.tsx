import type { TooltipContentProps } from "recharts";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "~/utils/api";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type TeamStats = RouterOutputs["picks"]["stats"][number];
type ChartDatum = { week: number } & Record<string, number>;
type Metric = "1u" | "wager";

const metricConfig = {
  "1u": {
    title: "1u Results",
    resultKey: "result",
    ariaLabel: "Cumulative overall 1u bet score for each team by week",
  },
  wager: {
    title: "Wager Results",
    resultKey: "resultByWagerAmount",
    ariaLabel: "Cumulative overall wager result for each team by week",
  },
} as const;

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const dashPatterns = [undefined, "8 4", "3 3"] as const;
const chartLabelFontSize = "0.875rem";
const chartMargin = { top: 8, right: 36, bottom: 20, left: 0 } as const;
const yAxisWidth = 48;
const minimumWeekTickWidth = 32;

function seriesKey(teamId: number) {
  return `team-${teamId}`;
}

function seriesStyle(index: number) {
  return {
    color: chartColors[index % chartColors.length],
    dash: dashPatterns[Math.floor(index / chartColors.length) % dashPatterns.length],
  };
}

function formatUnits(value: number) {
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? "+" : ""}${rounded}u`;
}

function buildChartData(teams: TeamStats[], metric: Metric) {
  const latestWeek = Math.max(0, ...teams.flatMap((team) => team.picks.map((pick) => pick.week)));

  if (latestWeek === 0) return [];

  const weeklyResults = new Map<string, number>();

  for (const team of teams) {
    for (const pick of team.picks) {
      const key = `${team.id}:${pick.week}`;
      const result = pick[metricConfig[metric].resultKey];
      weeklyResults.set(key, (weeklyResults.get(key) ?? 0) + (result ?? 0));
    }
  }

  const totals = new Map(teams.map((team) => [team.id, 0]));

  return Array.from({ length: latestWeek }, (_, index) => {
    const week = index + 1;
    const datum: ChartDatum = { week };

    for (const team of teams) {
      const total = (totals.get(team.id) ?? 0) + (weeklyResults.get(`${team.id}:${week}`) ?? 0);
      totals.set(team.id, total);
      datum[seriesKey(team.id)] = total;
    }

    return datum;
  });
}

function PerformanceTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload.length) return null;

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 shadow-md">
      <p className="mb-1 text-sm font-medium">Week {label}</p>
      <ul className="space-y-1 text-sm">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              {item.name}
            </span>
            <span className="font-medium tabular-nums">
              {typeof item.value === "number" ? formatUnits(item.value) : item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatsLineChart(props: { teams: TeamStats[] }) {
  const [metric, setMetric] = useState<Metric>("1u");
  const [chartWidth, setChartWidth] = useState(0);
  const config = metricConfig[metric];
  const data = buildChartData(props.teams, metric);
  const availableTickWidth = chartWidth - chartMargin.left - chartMargin.right - yAxisWidth;
  const showEveryWeek =
    chartWidth === 0 || availableTickWidth >= data.length * minimumWeekTickWidth;
  const visibleWeeks = data
    .map(({ week }) => week)
    .filter((week) => showEveryWeek || week % 2 === 0);

  return (
    <Card className="w-full gap-4">
      <CardHeader>
        <CardTitle className="text-primary-foreground">{config.title}</CardTitle>
        <CardDescription>Cumulative results from completed picks by week</CardDescription>
        <CardAction>
          <Select value={metric} onValueChange={(value) => setMetric(value as Metric)}>
            <SelectTrigger
              size="sm"
              className="bg-accent text-accent-foreground w-28"
              aria-label="Result calculation"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1u">1u</SelectItem>
              <SelectItem value="wager">Wager</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {data.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">No completed picks yet.</p>
        ) : (
          <>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} onResize={setChartWidth}>
                <LineChart
                  data={data}
                  margin={chartMargin}
                  accessibilityLayer
                  aria-label={config.ariaLabel}
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(week: number) => `W${week}`}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    ticks={visibleWeeks}
                    interval={0}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: chartLabelFontSize }}
                    label={{
                      value: "Week",
                      position: "insideBottom",
                      offset: -12,
                      fill: "var(--muted-foreground)",
                      fontSize: chartLabelFontSize,
                    }}
                  />
                  <YAxis
                    tickFormatter={(value: number) => formatUnits(value)}
                    tickLine={false}
                    axisLine={false}
                    width={yAxisWidth}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: chartLabelFontSize }}
                  />
                  <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                  <Tooltip
                    content={(tooltipProps) => <PerformanceTooltip {...tooltipProps} />}
                    cursor={{ stroke: "var(--border)" }}
                  />
                  {props.teams.map((team, index) => {
                    const style = seriesStyle(index);

                    return (
                      <Line
                        key={team.id}
                        type="linear"
                        dataKey={seriesKey(team.id)}
                        name={team.name}
                        stroke={style.color}
                        strokeDasharray={style.dash}
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div
              className="text-muted-foreground mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm"
              aria-label="Team legend"
            >
              {props.teams.map((team, index) => {
                const style = seriesStyle(index);

                return (
                  <span key={team.id} className="flex items-center gap-2">
                    <svg width="24" height="8" aria-hidden="true">
                      <line
                        x1="1"
                        x2="23"
                        y1="4"
                        y2="4"
                        stroke={style.color}
                        strokeDasharray={style.dash}
                        strokeWidth="2"
                      />
                    </svg>
                    {team.name}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
