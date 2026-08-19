import { useEffect, useEffectEvent, useMemo } from "react";

import type { Week } from "~/server/api/routers/cfb";
import type { RouterOutputs } from "~/utils/api";
import { Select } from "./select";
import { Skeleton } from "./ui/skeleton";

export function WeekSelect(props: {
  weeks?: RouterOutputs["cfb"]["calendar"];
  defaultType: "first" | "last" | "current";
  selectedWeek?: number;
  onChange: (week: Week) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const defaultValue = useMemo(() => {
    if (!props.weeks?.[0]) return;

    const lastWeek = props.weeks[props.weeks.length - 1];
    if (!lastWeek) return;

    const now = new Date();

    let defaultWeek: Week;

    switch (props.defaultType) {
      case "first":
        defaultWeek = props.weeks[0];
        break;
      case "last":
        defaultWeek = lastWeek;
        break;
      case "current":
        defaultWeek = props.weeks.find((week) => week.endDate >= now) ?? lastWeek;
        break;
    }

    return defaultWeek;
  }, [props.weeks, props.defaultType]);

  const notifyDefaultChange = useEffectEvent((week: Week) => {
    props.onChange(week);
  });

  useEffect(() => {
    if (defaultValue && props.selectedWeek === undefined) notifyDefaultChange(defaultValue);
  }, [defaultValue, props.selectedWeek]);

  const handleSelectChange = (v: string) => {
    if (!props.weeks) return;
    const weekNum = parseInt(v);
    const selectedWeek = props.weeks.find((w) => w.week === weekNum);
    if (selectedWeek) {
      props.onChange(selectedWeek);
    }
  };

  return props.weeks && defaultValue ? (
    <Select
      items={props.weeks.map((w) => ({
        value: w.week.toString(),
        display: `Week ${w.week}`,
      }))}
      value={(props.selectedWeek ?? defaultValue.week).toString()}
      onChange={handleSelectChange}
      className={props.className}
      ariaLabel={props.ariaLabel ?? "Week"}
    />
  ) : (
    <Skeleton className="h-9 w-full" />
  );
}
