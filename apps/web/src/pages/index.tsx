import { useRef, useState } from "react";

import type { AddPickDialogHandle } from "~/components/add-pick-dialog";
import type { Week } from "~/server/api/routers/cfb";
import { AddPickDialog } from "~/components/add-pick-dialog";
import { PickList } from "~/components/pick-list";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { WeekSelect } from "~/components/week-select";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

export default function Home() {
  const [week, setWeek] = useState<Week>();

  const calendar = api.cfb.calendar.useQuery();

  const picks = api.picks.selfPicks.useQuery({ week: week?.week }, { enabled: !!week });

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      <div className="sticky top-2 flex w-full items-center gap-4">
        <WeekSelect
          weeks={calendar.data}
          defaultType="current"
          onChange={setWeek}
          className="bg-accent text-accent-foreground flex-1"
        />
        {week && <AddPickButton week={week} disabled={!picks.data || picks.data.length >= 5} />}
      </div>
      {week && picks.data && <PickList picks={picks.data} week={week} />}
    </div>
  );
}

function AddPickButton(props: { week: Week; disabled: boolean }) {
  const dialogRef = useRef<AddPickDialogHandle>(null);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <AddPickDialog week={props.week} ref={dialogRef}>
            <Button disabled={props.disabled} onClick={dialogRef.current?.clear}>
              Add Pick
            </Button>
          </AddPickDialog>
        </div>
      </TooltipTrigger>
      {props.disabled && (
        <TooltipContent side="left" className="bg-accent">
          <p className="text-accent-foreground text-sm">Max 5 picks per week</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export const getServerSideProps = withSession();
