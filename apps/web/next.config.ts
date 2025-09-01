import type { NextConfig } from "next";

import "./src/env";

const config: NextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  transpilePackages: ["@cfb-picks/db", "@cfb-picks/cfbd"],
  output: "standalone",
};

export default config;
