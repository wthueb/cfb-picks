import type { PickWithGame } from "~/server/api/routers/picks";
import { PickCard } from "./pick-card";

export function PickList(props: { picks: PickWithGame[] }) {
  return (
    <div className="w-full">
      {props.picks.length === 0 ? (
        <p className="text-center">No picks found for this week.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {props.picks.map((pick, i) => (
            <li key={pick.id}>
              <PickCard pick={pick} num={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
