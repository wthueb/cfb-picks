import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type GenericSelectItemWithDisplay<T extends string> = { value: T; display: string };

export function GenericSelect<T extends string>(props: {
  items: readonly (T | GenericSelectItemWithDisplay<T>)[];
  defaultValue: NoInfer<T>;
  onChange: (value: T) => void;
  className?: string;
}) {
  const [value, setValue] = useState<T>(props.defaultValue);

  useEffect(() => {
    setValue(props.defaultValue);
  }, [props.defaultValue]);

  const displayString =
    typeof props.items[0] === "string"
      ? value
      : (props.items as GenericSelectItemWithDisplay<T>[]).find((item) => item.value === value)!
          .display;

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        setValue(v as T);
        props.onChange(v as T);
      }}
    >
      <SelectTrigger className={props.className}>
        <SelectValue>{displayString}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {props.items.map((item) =>
          typeof item === "string" ? (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ) : (
            <SelectItem key={item.value} value={item.value}>
              {item.display}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
