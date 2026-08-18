import type { NextConfig } from "next";

import "./src/env";

const config: NextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  serverExternalPackages: ["@cfb-picks/db"],
  transpilePackages: ["@cfb-picks/cfbd"],
  output: "standalone",
};

export default config;
