import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

export function TeamCombobox(props: { teams: string[]; onChange: (team: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="justify-between">
          {value ? props.teams.find((team) => team === value) : "Select team..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search team..." className="h-9" />
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup>
              {props.teams.map((team) => (
                <CommandItem
                  key={team}
                  value={team}
                  onSelect={() => {
                    if (team !== value) {
                      props.onChange(team);
                      setValue(team);
                    } else {
                      props.onChange(null);
                      setValue("");
                    }
                    setOpen(false);
                  }}
                >
                  {team}
                  <Check className={cn("ml-auto", value === team ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
