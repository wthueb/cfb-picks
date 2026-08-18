import path from "node:path";
import type { NextConfig } from "next";

import "./src/env";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  outputFileTracingIncludes: {
    "/*": ["../../node_modules/.pnpm/libsql@*/node_modules/@libsql/**/*"],
  },
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
