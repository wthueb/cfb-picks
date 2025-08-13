import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";

function Header() {
  const { data: sessionData } = useSession();

  return (
    <div className="flex items-center justify-between gap-4 bg-gray-800 px-4 py-1 text-white">
      <Link href="/" className="text-2xl">
        CFB Picks
      </Link>
      <div>
        <Button
          className="bg-gray-300 text-gray-800"
          onClick={sessionData ? () => void signOut() : () => void signIn()}
        >
          {sessionData ? "Sign out" : "Sign in"}
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const games = api.cfb.games.useQuery({ year: 2025, week: 1 });

  return (
    <>
      <Header />
      <main className="min-h-screen w-screen">
        <div className="flex w-full flex-col items-center gap-4 p-4">
          <h2 className="text-xl">Games for Week 1 of 2025</h2>
          {games.isLoading ? (
            <p>Loading...</p>
          ) : games.isError ? (
            <p className="text-red-500">Error: {games.error.message}</p>
          ) : (
            <ul className="list-disc">
              {games.data
                ? games.data.map((game) => (
                    <li key={game.id}>
                      {game.startDate.toLocaleString()} - {game.awayTeam} @ {game.homeTeam}
                    </li>
                  ))
                : null}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
