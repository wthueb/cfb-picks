import type { Session } from "next-auth";
import type { AppType } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";

import { Separator } from "~/components/ui/separator";
import { UserMenu } from "~/components/user-menu";
import { cn } from "~/lib/utils";

import "~/styles/globals.css";

import { api } from "~/utils/api";

const inter = Inter({
  subsets: ["latin"],
});

function Nav() {
  const router = useRouter();
  const links = [
    { href: "/stats", label: "Stats" },
    { href: "/board", label: "Board" },
  ];

  return (
    <nav className="bg-card text-card-foreground m-2 flex min-h-10 items-center justify-between gap-2 rounded-md border px-2 sm:px-4">
      <div className="flex h-full items-center gap-1 text-sm font-medium sm:gap-2">
        <Link
          href="/"
          aria-current={router.pathname === "/" ? "page" : undefined}
          className="text-primary-foreground rounded-md px-2 py-1 text-lg font-semibold sm:text-xl"
        >
          CFB Picks
        </Link>
        <Separator orientation="vertical" />
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={router.pathname === link.href ? "page" : undefined}
            className={cn(
              "rounded-md px-2 py-1 transition-colors",
              router.pathname === link.href
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/60",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <UserMenu />
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
        <div className={cn(inter.className, "flex min-h-screen w-full flex-col")}>
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
