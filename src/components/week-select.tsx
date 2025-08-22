import { useEffect, useMemo, useState } from "react";
import type { Week } from "~/server/api/routers/cfb";
import { api } from "~/utils/api";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const seasonTypeNames: Record<Week["seasonType"], string> = {
  regular: "Regular Season",
  postseason: "Playoffs",
};

export function WeekSelect(props: { onChange: (week: Week) => void; className?: string }) {
  const calendar = api.cfb.calendar.useQuery(
    { year: parseInt(process.env.NEXT_PUBLIC_SEASON!) },
    {
      select: (data) => {
        const current = data.find((week) => week.endDate >= now) ?? data[data.length - 1];

        if (current) {
          setValue(current.startDate.toISOString());
        }

        return data;
      },
    },
  );

  const bySeasonType = useMemo(() => {
    return calendar.data?.reduce(
      (acc, week) => {
        acc[week.seasonType] ??= [];
        acc[week.seasonType].push(week);
        return acc;
      },
      {} as Record<Week["seasonType"], Week[]>,
    );
  }, [calendar.data]);

  const [value, setValue] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);

  useEffect(() => {
    if (!calendar.data || !value) return;
    const week = calendar.data.find((week) => week.startDate.toISOString() === value);
    if (week) props.onChange(week);
    setSelectedWeek(week ?? null);
  }, [calendar.data, value, props]);

  const now = new Date();

  return (
    <Select value={value} onValueChange={setValue} disabled={!calendar.data}>
      <SelectTrigger className={props.className}>
        <SelectValue placeholder="Loading...">
          {selectedWeek
            ? `Week ${selectedWeek.week} (${seasonTypeNames[selectedWeek.seasonType]})`
            : "Select a week"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {bySeasonType &&
          Object.entries(bySeasonType).map(([seasonType, weeks]) => (
            <SelectGroup key={seasonType}>
              <SelectLabel>
                {seasonTypeNames[seasonType as keyof typeof seasonTypeNames]}
              </SelectLabel>
              {weeks.map((week) => (
                <SelectItem key={week.startDate.toISOString()} value={week.startDate.toISOString()}>
                  Week {week.week}
                  {week.startDate <= now && week.endDate >= now ? " (current)" : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
      </SelectContent>
    </Select>
  );
}
