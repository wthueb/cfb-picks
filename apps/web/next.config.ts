import "./src/env";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  transpilePackages: ["@cfb-picks/db"],
  output: "standalone",
};

export default config;
