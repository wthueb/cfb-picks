import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useSession } from "next-auth/react";

import type { Game } from "@cfb-picks/cfbd";
import { isGameLocked } from "@cfb-picks/lib/dates";

import type { RouterOutputs } from "~/utils/api";
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

export function GameCombobox(props: {
  games: RouterOutputs["cfb"]["games"];
  value?: Game;
  onChange: (game?: RouterOutputs["cfb"]["games"][number]) => void;
  id?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const value = props.value?.id.toString() ?? "";

  const session = useSession();

  const games = props.games.map((game) => ({
    ...game,
    label: `${game.awayTeam} @ ${game.homeTeam}`,
  }));

  const selectedGame = props.games.find((game) => game.id.toString() === value) ?? null;

  const comboboxId = "game-combobox-list";

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={props.id}
          variant="outline"
          role="combobox"
          aria-label={props.ariaLabel}
          aria-expanded={open}
          aria-controls={comboboxId}
          className="w-full min-w-0 justify-between overflow-hidden"
        >
          <span className="min-w-0 truncate text-left">
            {selectedGame
              ? `${selectedGame.awayTeam} @ ${selectedGame.homeTeam}`
              : "Select game..."}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command id={comboboxId}>
          <CommandInput placeholder="Search game..." />
          <CommandList>
            <CommandEmpty>No games found.</CommandEmpty>
            <CommandGroup>
              {games.map((game) => (
                <CommandItem
                  key={game.id}
                  value={game.label}
                  disabled={!session.data?.user.isAdmin && isGameLocked(game.startDate)}
                  onSelect={() => {
                    if (game.id.toString() !== value) {
                      props.onChange(game);
                    } else {
                      props.onChange(undefined);
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
