import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function GenericSelect<T extends string>(props: {
  items: readonly (T | { value: T; display: string })[];
  defaultValue: NoInfer<T>;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState<T>(props.defaultValue);

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        setValue(v as T);
        props.onChange(v as T);
      }}
    >
      <SelectTrigger className={props.className}>
        <SelectValue>{value || props.placeholder}</SelectValue>
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
