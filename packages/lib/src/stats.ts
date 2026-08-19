export type ScoredPick = {
  id: number;
  week: number;
  pickType: string;
  duration: string;
  double: boolean;
  result: number;
  resultByWagerAmount: number;
  startDate: Date;
};

export type RecordSummary = {
  total: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  net1u: number;
  netWager: number;
  unitsPerPick: number;
};

export type WeeklyPerformance = RecordSummary & {
  week: number;
  cumulative1u: number;
  cumulativeWager: number;
};

export type PerformanceBreakdown = RecordSummary & {
  key: string;
};

export type TeamPerformance = {
  summary: RecordSummary & {
    currentStreak: { result: "W" | "L" | null; count: number };
    bestWeek: { week: number; net1u: number } | null;
    worstWeek: { week: number; net1u: number } | null;
  };
  weekly: WeeklyPerformance[];
  breakdowns: {
    pickType: PerformanceBreakdown[];
    duration: PerformanceBreakdown[];
    stake: PerformanceBreakdown[];
  };
};

function summarize(picks: ScoredPick[]): RecordSummary {
  const wins = picks.filter((pick) => pick.result > 0).length;
  const losses = picks.filter((pick) => pick.result < 0).length;
  const pushes = picks.length - wins - losses;
  const net1u = picks.reduce((total, pick) => total + pick.result, 0);
  const netWager = picks.reduce((total, pick) => total + pick.resultByWagerAmount, 0);

  return {
    total: picks.length,
    wins,
    losses,
    pushes,
    winRate: wins + losses === 0 ? 0 : wins / (wins + losses),
    net1u,
    netWager,
    unitsPerPick: picks.length === 0 ? 0 : net1u / picks.length,
  };
}

function buildBreakdown(picks: ScoredPick[], getKey: (pick: ScoredPick) => string) {
  const groups = new Map<string, ScoredPick[]>();

  for (const pick of picks) {
    const key = getKey(pick);
    groups.set(key, [...(groups.get(key) ?? []), pick]);
  }

  return Array.from(groups.entries())
    .map(([key, groupedPicks]) => ({ key, ...summarize(groupedPicks) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function getCurrentStreak(picks: ScoredPick[]) {
  const outcomes = [...picks]
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.id - b.id)
    .map((pick) => (pick.result > 0 ? "W" : pick.result < 0 ? "L" : null))
    .filter((result): result is "W" | "L" => result !== null);

  const result = outcomes.at(-1) ?? null;
  let count = 0;

  for (let index = outcomes.length - 1; index >= 0 && outcomes[index] === result; index -= 1) {
    count += 1;
  }

  return { result, count };
}

export function aggregateTeamPerformance(
  picks: ScoredPick[],
  latestWeek?: number,
): TeamPerformance {
  const highestPickWeek = Math.max(0, ...picks.map((pick) => pick.week));
  const lastWeek = Math.max(highestPickWeek, latestWeek ?? 0);
  let cumulative1u = 0;
  let cumulativeWager = 0;

  const weekly = Array.from({ length: lastWeek }, (_, index) => {
    const week = index + 1;
    const weekSummary = summarize(picks.filter((pick) => pick.week === week));
    cumulative1u += weekSummary.net1u;
    cumulativeWager += weekSummary.netWager;

    return { week, ...weekSummary, cumulative1u, cumulativeWager };
  });

  const weeksWithPicks = weekly.filter((week) => week.total > 0);
  const bestWeek = [...weeksWithPicks].sort((a, b) => b.net1u - a.net1u || a.week - b.week)[0];
  const worstWeek = [...weeksWithPicks].sort((a, b) => a.net1u - b.net1u || a.week - b.week)[0];

  return {
    summary: {
      ...summarize(picks),
      currentStreak: getCurrentStreak(picks),
      bestWeek: bestWeek ? { week: bestWeek.week, net1u: bestWeek.net1u } : null,
      worstWeek: worstWeek ? { week: worstWeek.week, net1u: worstWeek.net1u } : null,
    },
    weekly,
    breakdowns: {
      pickType: buildBreakdown(picks, (pick) => pick.pickType),
      duration: buildBreakdown(picks, (pick) => pick.duration),
      stake: buildBreakdown(picks, (pick) => (pick.double ? "Double" : "Regular")),
    },
  };
}

export function rankTeamPerformance<
  T extends {
    name: string;
    summary: Pick<RecordSummary, "net1u" | "netWager" | "wins">;
  },
>(teams: T[]) {
  return [...teams]
    .sort(
      (a, b) =>
        b.summary.net1u - a.summary.net1u ||
        b.summary.netWager - a.summary.netWager ||
        b.summary.wins - a.summary.wins ||
        a.name.localeCompare(b.name),
    )
    .map((team, index) => ({ ...team, rank: index + 1 }));
}
