import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { withSession } from "~/server/auth";
import { api, type RouterOutputs } from "~/utils/api";

function StatCard(props: { team: RouterOutputs["picks"]["stats"][number] }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-primary-foreground">{props.team.name}</CardTitle>
        <CardDescription>{props.team.users.map((u) => u.name).join(", ")}</CardDescription>
        <CardAction>
          <Button variant="outline" className="text-secondary-foreground" asChild>
            <Link href={{ pathname: "/teams", query: { teamId: props.team.id } }}>View Team</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex justify-between gap-4 text-sm">
        <div>
          <div className="flex justify-between gap-2">
            <p>Total Picks:</p>
            <p>{props.team.totalPicks}</p>
          </div>
          <div className="flex justify-between gap-2">
            <p>Wins:</p>
            <p>{props.team.wins}</p>
          </div>
          <div className="flex justify-between gap-2">
            <p>Losses:</p>
            <p>{props.team.losses}</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between gap-2">
            <p>Winnings (wager amt):</p>
            <p>{+props.team.winningsByWagerAmount.toFixed(2)}</p>
          </div>
          <div className="flex justify-between gap-2">
            <p>Winnings (1u bet):</p>
            <p>{+props.team.winnings.toFixed(2)}</p>
          </div>
          <div className="flex justify-between gap-2">
            <p>Potential (1u bet):</p>
            <p>{+props.team.potential.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Stats() {
  // TODO: look into graphs and things

  const stats = api.picks.stats.useQuery();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      {stats.data && (
        <ul className="flex w-full flex-col gap-4">
          {stats.data.map((team) => (
            <li key={team.id}>
              <StatCard team={team} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const getServerSideProps = withSession();
