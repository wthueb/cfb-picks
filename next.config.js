import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  transpilePackages: ["next-auth"],
  output: "standalone",
};

export default config;
