import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: z.url(),
    CFB_API_KEY: z.string(),
    SEASON: z.coerce.number().int(),

    NEXTAUTH_URL: z.url(),
    AUTH_SECRET: process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.email().optional(),
  },

  client: {},

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,

    DATABASE_URL: process.env.DATABASE_URL,
    CFB_API_KEY: process.env.CFB_API_KEY,
    SEASON: process.env.SEASON,

    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  emptyStringAsUndefined: true,

  createFinalSchema: (shape, isServer) =>
    z.object(shape).transform((env, ctx) => {
      if (!isServer) return env;
      if (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_SECRET) {
        ctx.addIssue({
          code: "custom",
          message: "GOOGLE_CLIENT_SECRET is required when GOOGLE_CLIENT_ID is set",
        });
        return z.NEVER;
      }
      if (env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_ID) {
        ctx.addIssue({
          code: "custom",
          message: "GOOGLE_CLIENT_ID is required when GOOGLE_CLIENT_SECRET is set",
        });
        return z.NEVER;
      }

      if (env.SMTP_HOST && !env.SMTP_PORT) {
        ctx.addIssue({ code: "custom", message: "SMTP_PORT is required when SMTP_HOST is set" });
        return z.NEVER;
      }
      if (env.SMTP_PORT && !env.SMTP_HOST) {
        ctx.addIssue({ code: "custom", message: "SMTP_HOST is required when SMTP_PORT is set" });
        return z.NEVER;
      }

      if (env.SMTP_HOST && !env.EMAIL_FROM) {
        ctx.addIssue({ code: "custom", message: "EMAIL_FROM is required when SMTP is set" });
        return z.NEVER;
      }

      if (!env.GOOGLE_CLIENT_ID && !env.SMTP_HOST) {
        ctx.addIssue({
          code: "custom",
          message: "At least one of GOOGLE_CLIENT_ID or SMTP_HOST is required for auth",
        });
        return z.NEVER;
      }

      return env;
    }),
});
