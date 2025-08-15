import { useState } from "react";

import { WeekSelect, type Week } from "~/components/week-select";
import { api } from "~/utils/api";

export default function Home() {
  const [week, setWeek] = useState<Week>();

  const games = api.cfb.games.useQuery(
    { year: week?.season ?? 2025, week: week?.week, seasonType: week?.seasonType },
    {
      enabled: !!week,
    },
  );

  return (
    <div className="flex w-full flex-col items-center gap-4 p-4">
      <WeekSelect onChange={setWeek} />
      {games.data ? (
        <div className="w-full max-w-3xl">
          {games.data.length === 0 ? (
            <p>No games found for this week.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {games.data.map((game) => (
                <li
                  key={game.id}
                  className="hover:bg-accent flex justify-between rounded-md border p-2"
                >
                  <span>
                    {game.awayTeam} at {game.homeTeam}
                  </span>
                  <span>{game.startDate.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
