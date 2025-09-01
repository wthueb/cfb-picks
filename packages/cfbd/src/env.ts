import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
  server: {
    REDIS_URL: z.url().default("redis://localhost:6379"),
    CFB_API_KEY: z.string(),
    SEASON: z.coerce.number().min(2000),
  },

  shared: {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
  },

  runtimeEnv: process.env,

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  emptyStringAsUndefined: true,
});
