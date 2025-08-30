import baseConfig, { restrictEnvAccess } from "@cfb-picks/eslint-config/base";
import nextjsConfig from "@cfb-picks/eslint-config/nextjs";
import reactConfig from "@cfb-picks/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
