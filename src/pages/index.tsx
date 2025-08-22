import type { GetServerSidePropsContext } from "next";
import { useRef, useState } from "react";
import { AddPickDialog, type AddPickDialogHandle } from "~/components/add-pick-dialog";
import { PickCard } from "~/components/pick-card";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { WeekSelect } from "~/components/week-select";
import type { Week } from "~/server/api/routers/cfb";
import { auth } from "~/server/auth";
import { api } from "~/utils/api";

export default function Home() {
  const [week, setWeek] = useState<Week | null>(null);

  const picks = api.picks.selfPicks.useQuery(
    {
      season: week?.season ?? parseInt(process.env.NEXT_PUBLIC_SEASON!),
      week: week?.week,
    },
    {
      enabled: !!week,
    },
  );

  const dialogRef = useRef<AddPickDialogHandle>(null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 p-4 pt-2">
      <div className="sticky top-2 flex w-full items-center gap-4">
        <WeekSelect onChange={setWeek} className="bg-accent flex-grow" />
        {week && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AddPickDialog week={week} ref={dialogRef}>
                    <Button
                      disabled={picks.data && picks.data.length >= 5}
                      onClick={dialogRef.current?.clear}
                    >
                      Add Pick
                    </Button>
                  </AddPickDialog>
                </div>
              </TooltipTrigger>
              {picks.data && picks.data.length >= 5 && (
                <TooltipContent side="left" className="bg-accent">
                  <p className="text-accent-foreground text-sm">Max 5 picks per week.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {picks.data && (
        <div className="w-full">
          {picks.data.length === 0 ? (
            <p className="text-center">No picks found for this week.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {picks.data.map((res, i) => (
                <li key={res.pick.id}>
                  <PickCard pick={res.pick} num={i} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await auth(ctx);

  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }

  return { props: {} };
}
