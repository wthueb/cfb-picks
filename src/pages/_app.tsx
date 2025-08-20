import { type Session } from "next-auth";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { type AppType } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

import { cn } from "~/lib/utils";
import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
});

function Nav() {
  const { data: sessionData } = useSession();

  return (
    <nav className="bg-card text-card-foreground m-2 flex items-center justify-between gap-4 rounded-md border-1 px-3 py-1">
      <Link href="/" className="text-2xl">
        CFB Picks
      </Link>
      <div>
        <Button variant="ghost" onClick={sessionData ? () => void signOut() : () => void signIn()}>
          {sessionData ? "Sign out" : "Sign in"}
        </Button>
      </div>
    </nav>
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
      </Head>
      <SessionProvider session={session}>
        <div className={cn(inter.className, "flex min-h-screen w-screen min-w-[360px] flex-col")}>
          <Nav />
          <main className="flex-1">
            <Component {...pageProps} />
          </main>
          <footer className="text-muted-foreground m-2 text-center text-xs">
            <span>
              Made by{" "}
              <a href="https://wthueb.dev" target="_blank" className="underline">
                wthueb.dev
              </a>
            </span>
          </footer>
        </div>
      </SessionProvider>
    </>
  );
};

export default api.withTRPC(CFBPicks);
