import { useEffect, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

import { pickTypes } from "~/server/db/schema";

type PickType = (typeof pickTypes)[number];

export function PickTypeSelect(props: {
  onChange: (pickType: PickType) => void;
  className?: string;
}) {
  const [value, setValue] = useState<PickType>("SPREAD");

  useEffect(() => {
    if (value) {
      props.onChange(value);
    }
  }, [value, props]);

  return (
    <Select value={value} onValueChange={(v) => setValue(v as PickType)}>
      <SelectTrigger className={props.className}>
        <SelectValue>{value || "Select a pick type..."}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {pickTypes.map((pickType) => (
          <SelectItem key={pickType} value={pickType}>
            {pickType.replace("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
