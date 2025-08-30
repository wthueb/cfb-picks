import type { Session } from "next-auth";
import type { AppType } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";
import Link from "next/link";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

import "~/styles/globals.css";

import { api } from "~/utils/api";

const inter = Inter({
  subsets: ["latin"],
});

function Nav() {
  const session = useSession();

  return (
    <nav className="bg-card text-card-foreground m-2 flex h-10 items-center justify-between gap-4 rounded-md border-1 px-4">
      <div className="flex h-full items-center gap-4 text-sm font-medium">
        <Link href="/" className="text-primary-foreground text-xl font-semibold">
          CFB Picks
        </Link>
        <Separator orientation="vertical" />
        <Link href="/stats">Stats</Link>
        <Link href="/teams">Teams</Link>
      </div>
      <div>
        {session.status === "loading" ? (
          <Skeleton className="h-8 w-[8ch]" />
        ) : (
          <Button
            variant="ghost"
            onClick={session.data ? () => signOut() : () => signIn()}
            className="text-muted-foreground"
          >
            {session.data ? "Sign out" : "Sign in"}
          </Button>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground flex justify-between p-2 text-xs opacity-50">
      <span>
        by{" "}
        <a href="https://wthueb.dev" target="_blank" className="underline">
          wthueb.dev
        </a>
      </span>
      <span>
        data from{" "}
        <a href="https://collegefootballdata.com" target="_blank" className="underline">
          collegefootballdata.com
        </a>
      </span>
    </footer>
  );
}

const CFBPicks: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <>
      <Head>
        <title>CFB Picks</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SessionProvider session={session}>
        <div className={cn(inter.className, "flex min-h-screen w-screen min-w-[390px] flex-col")}>
          <Nav />
          <main className="flex-1">
            <Component {...pageProps} />
          </main>
          <Footer />
        </div>
      </SessionProvider>
    </>
  );
};

export default api.withTRPC(CFBPicks);
