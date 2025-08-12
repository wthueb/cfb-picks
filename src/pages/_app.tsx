import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import Head from "next/head";
import { Inter } from "next/font/google";

import { api } from "@/utils/api";

import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
});

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <>
      <Head>
        <title>CFB Picks</title>
      </Head>
      <SessionProvider session={session}>
        <div className={inter.className}>
          <Component {...pageProps} />
        </div>
      </SessionProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
