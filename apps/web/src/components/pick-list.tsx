import type { CFBPick } from "@cfb-picks/db/schema";

import type { Week } from "~/server/api/routers/cfb";
import { PickCard } from "./pick-card";

export function PickList(props: { picks: CFBPick[]; week: Week }) {
  return (
    <div className="w-full">
      {props.picks.length === 0 ? (
        <p className="text-center">No picks found for this week.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {props.picks.map((pick, i) => (
            <li key={pick.id}>
              <PickCard pick={pick} num={i} week={props.week} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
