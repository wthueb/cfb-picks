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
import type { RouterOutputs } from "~/utils/api";

export function GameCombobox(props: {
  games: RouterOutputs["cfb"]["games"];
  onChange: (game: RouterOutputs["cfb"]["games"][number] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const games = props.games.map((game) => ({
    ...game,
    label: `${game.awayTeam} @ ${game.homeTeam}`,
  }));

  const selectedGame = props.games.find((game) => game.id.toString() === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="justify-between">
          {selectedGame ? `${selectedGame.awayTeam} @ ${selectedGame.homeTeam}` : "Select game..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search game..." />
          <CommandList>
            <CommandEmpty>No games found.</CommandEmpty>
            <CommandGroup>
              {games.map((game) => (
                <CommandItem
                  key={game.id}
                  value={game.label}
                  onSelect={() => {
                    if (game.id.toString() !== value) {
                      props.onChange(game);
                      setValue(game.id.toString());
                    } else {
                      setValue("");
                      props.onChange(null);
                    }
                    setOpen(false);
                  }}
                >
                  {game.label} (
                  {game.startDate.toLocaleString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  )
                  <Check
                    className={cn(
                      "ml-auto",
                      game.id.toString() === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
