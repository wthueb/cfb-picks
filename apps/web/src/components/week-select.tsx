import { useEffect, useMemo, useRef, useState } from "react";

import type { Week } from "~/server/api/routers/cfb";
import type { RouterOutputs } from "~/utils/api";
import { Select } from "./select";
import { Skeleton } from "./ui/skeleton";

export function WeekSelect(props: {
  weeks?: RouterOutputs["cfb"]["calendar"];
  defaultType: "first" | "last" | "current";
  onChange: (week: Week) => void;
  className?: string;
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

  const [initialized, setInitialized] = useState(false);
  const onChangeRef = useRef(props.onChange);

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  const handleSelectChange = (v: string) => {
    if (!props.weeks) return;
    const weekNum = parseInt(v);
    const selectedWeek = props.weeks.find((w) => w.week === weekNum);
    if (selectedWeek) {
      props.onChange(selectedWeek);
    }
  };

  // Initialize with default value on first render
  if (defaultValue && !initialized) {
    setInitialized(true);
    onChangeRef.current(defaultValue);
  }

  return props.weeks && defaultValue ? (
    <Select
      items={props.weeks.map((w) => ({
        value: w.week.toString(),
        display: `Week ${w.week}`,
      }))}
      defaultValue={defaultValue.week.toString()}
      onChange={handleSelectChange}
      className={props.className}
    />
  ) : (
    <Skeleton className="h-9 w-full" />
  );
}
