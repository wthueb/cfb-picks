import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { withSession } from "~/server/auth";
import { api } from "~/utils/api";

function sumBy<T>(
  arr: T[],
  key: { [K in keyof T]: T[K] extends number | null | undefined ? K : never }[keyof T],
) {
  return arr.reduce((acc, item) => acc + ((item[key] as number | null | undefined) ?? 0), 0);
}

export default function Leaderboard() {
  // TODO: look into graphs and things

  const teams = api.picks.leaderboard.useQuery();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-2">
      {/* <pre className="text-xs">{JSON.stringify(teams.data, null, 2)}</pre> */}
      {teams.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-primary-foreground font-bold">Team</TableHead>
              <TableHead className="text-primary-foreground">Picks</TableHead>
              <TableHead className="text-primary-foreground">Wins</TableHead>
              <TableHead className="text-primary-foreground">Losses</TableHead>
              <TableHead className="text-primary-foreground">Potential (units)</TableHead>
              <TableHead className="text-primary-foreground">Winnings (units)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.data.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-bold">{team.name}</TableCell>
                <TableCell>{team.totalPicks}</TableCell>
                <TableCell>{team.wins}</TableCell>
                <TableCell>{team.losses}</TableCell>
                <TableCell>{team.potential.toFixed(2)}</TableCell>
                <TableCell>{team.winnings.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell>{sumBy(teams.data, "totalPicks")}</TableCell>
              <TableCell>{sumBy(teams.data, "wins")}</TableCell>
              <TableCell>{sumBy(teams.data, "losses")}</TableCell>
              <TableCell>{sumBy(teams.data, "potential").toFixed(2)}</TableCell>
              <TableCell>{sumBy(teams.data, "winnings").toFixed(2)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <span>Loading...</span>
      )}
    </div>
  );
}

export const getServerSideProps = withSession();
