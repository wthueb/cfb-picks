import { createEnv } from "@t3-oss/env-core";
import z from "zod";

import { env as dbEnv } from "@cfb-picks/db/env";

export const env = createEnv({
  server: {
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.email().optional(),
  },

  shared: {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
  },

  runtimeEnv: process.env,

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  emptyStringAsUndefined: true,

  createFinalSchema: (shape, isServer) =>
    z.object(shape).transform((env, ctx) => {
      if (!isServer) return env;

      if (env.SMTP_HOST && !env.SMTP_PORT) {
        ctx.addIssue({
          code: "custom",
          message: "SMTP_PORT is required when SMTP_HOST is set",
        });
        return z.NEVER;
      }

      if (env.SMTP_PORT && !env.SMTP_HOST) {
        ctx.addIssue({
          code: "custom",
          message: "SMTP_HOST is required when SMTP_PORT is set",
        });
        return z.NEVER;
      }

      if (env.SMTP_HOST && !env.EMAIL_FROM) {
        ctx.addIssue({
          code: "custom",
          message: "EMAIL_FROM is required when SMTP is set",
        });
        return z.NEVER;
      }

      return env;
    }),

  extends: [dbEnv],
});
