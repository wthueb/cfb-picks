import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { users } from "@cfb-picks/db/schema";

import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

function emailNotificationsAvailable() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM);
}

export const userRouter = createTRPCRouter({
  preferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db
      .select({ sendNotifications: users.sendNotifications })
      .from(users)
      .where(eq(users.id, ctx.session.user.id))
      .get();

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    return {
      sendNotifications: user.sendNotifications,
      emailNotificationsAvailable: emailNotificationsAvailable(),
    };
  }),

  updatePreferences: protectedProcedure
    .input(z.object({ sendNotifications: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (input.sendNotifications && !emailNotificationsAvailable()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email notifications are not configured",
        });
      }

      const result = await ctx.db
        .update(users)
        .set({ sendNotifications: input.sendNotifications })
        .where(eq(users.id, ctx.session.user.id));

      if (result.rowsAffected !== 1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return { sendNotifications: input.sendNotifications };
    }),
});
