import { render } from "@react-email/components";
import nodemailer from "nodemailer";

import type { Game } from "@cfb-picks/cfbd";
import type { InferSelectModel } from "@cfb-picks/db";
import type { CFBPick, teams } from "@cfb-picks/db/schema";
import { getGameById } from "@cfb-picks/cfbd";
import { db } from "@cfb-picks/db/client";
import { pickNotifications } from "@cfb-picks/db/schema";
import { isGameLocked } from "@cfb-picks/lib/dates";

import NotificationEmail from "../emails/notification";
import { env } from "./env";

if (!env.SMTP_HOST || !env.SMTP_PORT) {
  throw new Error("SMTP is not configured");
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

await transporter.verify();

while (true) {
  const picks = await db.query.picks.findMany({
    with: {
      notifications: {
        with: {
          user: true,
        },
      },
      team: true,
    },
  });

  const picksWithGame = (await Promise.all(
    picks.map(async (pick) => ({
      ...pick,
      game: await getGameById(pick.gameId),
    })),
  ).then((picks) => picks.filter((pick) => pick.game !== null))) as (CFBPick & {
    notifications: InferSelectModel<typeof pickNotifications>[];
    team: InferSelectModel<typeof teams>;
    game: Game;
  })[];

  const lockedPicks = picksWithGame.filter((pick) => isGameLocked(pick.game.startDate));

  const usersToNotify = await db.query.users
    .findMany({
      where: (users, { eq }) => eq(users.sendNotifications, true),
    })
    .then((users) =>
      users.map((user) => ({
        ...user,
        picksToSend: [] as (CFBPick & { team: InferSelectModel<typeof teams>; game: Game })[],
      })),
    );

  for (const user of usersToNotify) {
    user.picksToSend.push(
      ...lockedPicks.filter(
        (pick) => !pick.notifications.some((notification) => notification.userId === user.id),
      ),
    );
  }

  for (const user of usersToNotify) {
    if (user.picksToSend.length === 0) {
      console.log(`No new locked picks to send for user ${user.email}`);
      continue;
    }

    const emailHtml = await render(NotificationEmail({ picks: user.picksToSend }));

    console.log(
      `Sending email to ${user.email} for ${user.picksToSend.length} locked picks:`,
      user.picksToSend.map((pick) => pick.id),
    );

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: user.email,
      subject: "CFB picks have been locked",
      html: emailHtml,
    });

    for (const pick of user.picksToSend) {
      await db.insert(pickNotifications).values({
        pickId: pick.id,
        userId: user.id,
      });
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1000 * 60));
}
