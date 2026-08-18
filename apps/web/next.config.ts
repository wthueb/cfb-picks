import type { NextConfig } from "next";

import "./src/env";

const config: NextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  serverExternalPackages: ["@cfb-picks/db"],
  webpack(config, { isServer, nextRuntime }) {
    if (isServer && nextRuntime === "nodejs" && Array.isArray(config.externals)) {
      config.externals.push(/^@cfb-picks\/db(?:\/.*)?$/);
    }

    return config;
  },
};

export default config;
