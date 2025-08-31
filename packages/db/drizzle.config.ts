import { type Config } from "drizzle-kit";

import { env } from "./src/env";

export default {
  schema: "./src/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ["cfb-picks_*"],
} satisfies Config;
