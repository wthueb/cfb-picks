import type { CFBPick } from "@cfb-picks/db/schema";

export type PickInsight = "consensus" | "conflict" | "unique";

export function getPickMarketKey(pick: CFBPick) {
  if (pick.pickType === "SPREAD") return `${pick.gameId}:SPREAD:${pick.duration}`;
  if (pick.pickType === "MONEYLINE") return `${pick.gameId}:MONEYLINE:${pick.duration}`;
  if (pick.pickType === "TT_OVER" || pick.pickType === "TT_UNDER") {
    return `${pick.gameId}:TEAM_TOTAL:${pick.cfbTeamId}:${pick.duration}`;
  }

  return `${pick.gameId}:TOTAL:${pick.duration}`;
}

export function getPickSelectionKey(pick: CFBPick) {
  if (pick.pickType === "SPREAD") {
    return `${getPickMarketKey(pick)}:${pick.cfbTeamId}:${pick.spread}`;
  }
  if (pick.pickType === "MONEYLINE") {
    return `${getPickMarketKey(pick)}:${pick.cfbTeamId}`;
  }

  return `${getPickMarketKey(pick)}:${pick.pickType}:${pick.total}`;
}

export function classifyPickInsights<T extends { pick: CFBPick }>(items: T[]) {
  const marketGroups = new Map<string, T[]>();

  for (const item of items) {
    const key = getPickMarketKey(item.pick);
    marketGroups.set(key, [...(marketGroups.get(key) ?? []), item]);
  }

  return items.map((item) => {
    const marketItems = marketGroups.get(getPickMarketKey(item.pick)) ?? [];
    const selectionGroups = new Map<string, T[]>();

    for (const marketItem of marketItems) {
      const key = getPickSelectionKey(marketItem.pick);
      selectionGroups.set(key, [...(selectionGroups.get(key) ?? []), marketItem]);
    }
    const matchingPicks = selectionGroups.get(getPickSelectionKey(item.pick))?.length ?? 0;
    const insight: PickInsight =
      matchingPicks >= 2 ? "consensus" : selectionGroups.size > 1 ? "conflict" : "unique";

    return { ...item, insight };
  });
}
