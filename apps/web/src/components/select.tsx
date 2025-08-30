import type { JSX } from "react";
import { useEffect, useState } from "react";

import {
  Select as NormalSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type SelectItemWithDisplay<T extends string> = { value: T; display: string };
type SelectItem<T extends string> = T | SelectItemWithDisplay<T>;

export function Select<T extends string>(props: {
  items: readonly SelectItem<T>[];
  defaultValue: NoInfer<T>;
  onChange: (value: T) => void;
  className?: string;
}): JSX.Element;
export function Select<T extends string, G extends string>(props: {
  items: Record<G, SelectItem<T>[]>;
  defaultValue: NoInfer<`${G}-${T}`>;
  onChange: (value: `${G}-${T}`) => void;
  className?: string;
}): JSX.Element;
export function Select<T extends string, G extends string>(props: {
  items: readonly SelectItem<T>[] | Record<G, SelectItem<T>[]>;
  defaultValue: NoInfer<T | `${G}-${T}`>;
  onChange: (value: T | `${G}-${T}`) => void;
  className?: string;
}) {
  const [value, setValue] = useState<T | `${G}-${T}`>(props.defaultValue);

  useEffect(() => {
    setValue(props.defaultValue);
  }, [props.defaultValue]);

  let displayString: string;

  if (!Array.isArray(props.items)) {
    const groupedItems = props.items as Record<G, SelectItem<T>[]>;
    const [group, v] = (value as `${G}-${T}`).split("-") as [G, T];

    const display =
      typeof groupedItems[group][0] === "string"
        ? v
        : (groupedItems[group] as SelectItemWithDisplay<T>[]).find((item) => item.value === v)
            ?.display;

    displayString = `${display} (${group})`;
  } else {
    const itemsArray = props.items as SelectItem<T>[];
    displayString =
      typeof itemsArray[0] === "string"
        ? (value as T)
        : ((itemsArray as SelectItemWithDisplay<T>[]).find((item) => item.value === value)
            ?.display ?? value);
  }

  return (
    <NormalSelect
      value={value}
      onValueChange={(v) => {
        setValue(v as T | `${G}-${T}`);
        props.onChange(v as T | `${G}-${T}`);
      }}
    >
      <SelectTrigger className={props.className}>
        <SelectValue>{displayString}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {!Array.isArray(props.items) ? (
          (Object.entries(props.items) as [G, SelectItem<T>[]][]).map(([group, items]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              <SelectItems items={items} group={group} />
            </SelectGroup>
          ))
        ) : (
          <SelectItems items={props.items} />
        )}
      </SelectContent>
    </NormalSelect>
  );
}

function SelectItems(props: { items: SelectItem<string>[]; group?: string }) {
  const items = props.items.map((item) =>
    typeof item === "string"
      ? { value: props.group ? `${props.group}-${item}` : item, display: item }
      : {
          value: props.group ? `${props.group}-${item.value}` : item.value,
          display: item.display,
        },
  );

  return (
    <>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.display}
        </SelectItem>
      ))}
    </>
  );
}
