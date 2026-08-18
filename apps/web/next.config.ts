import type { NextConfig } from "next";

import "./src/env";

const config: NextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  transpilePackages: ["@cfb-picks/cfbd"],
  webpack(config, { isServer }) {
    if (isServer) config.externals.push(/^@cfb-picks\/db(?:\/.*)?$/);
    return config;
  },
  output: "standalone",
};

export default config;
