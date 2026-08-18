import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/** @type {Awaited<import('typescript-eslint').Config>} */
export default [
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react: reactPlugin,
    },
    rules: {
      ...reactPlugin.configs["jsx-runtime"].rules,
    },
    languageOptions: {
      globals: {
        React: "writable",
      },
    },
  },
];
