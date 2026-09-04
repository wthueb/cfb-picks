import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { render } from "react-email";

import type { Game } from "@cfb-picks/cfbd";
import type { InferSelectModel } from "@cfb-picks/db";
import type { CFBPick, teams } from "@cfb-picks/db/schema";
import { getGamesForYear } from "@cfb-picks/cfbd";
import { db } from "@cfb-picks/db/client";
import { pickNotifications } from "@cfb-picks/db/schema";
import { isGameLocked } from "@cfb-picks/lib/dates";
import { getLogger, withLogContext } from "@cfb-picks/logging";

import NotificationEmail from "../emails/notification.js";
import { env } from "./env.js";

const logger = getLogger("cfb_picks.notifier");
const pollIntervalMs = 1000 * 60;

async function pollForNotifications(transporter: Transporter): Promise<void> {
  const startedAt = Date.now();
  logger.debug("notification poll started");

  const picks = await db.query.picks
    .findMany({
      where: (pick, { eq }) => eq(pick.season, env.SEASON),
      with: {
        notifications: {
          with: {
            user: true,
          },
        },
        team: true,
      },
    })
    .then((picks) => picks.filter((pick) => env.NODE_ENV !== "production" || pick.teamId !== 1));

  const gamesById = new Map(
    (await getGamesForYear(env.SEASON)).map((game) => [game.id, game] as const),
  );
  const missingGamePicks = picks.filter((pick) => !gamesById.has(pick.gameId));

  if (missingGamePicks.length > 0) {
    logger.warning("notification pick games not found", {
      season: env.SEASON,
      missing_pick_count: missingGamePicks.length,
      game_ids: [...new Set(missingGamePicks.map((pick) => pick.gameId))],
    });
  }

  const picksWithGame = picks.flatMap((pick) => {
    const game = gamesById.get(pick.gameId);
    return game ? [{ ...pick, game }] : [];
  }) as (CFBPick & {
    notifications: InferSelectModel<typeof pickNotifications>[];
    team: InferSelectModel<typeof teams>;
    game: Game;
  })[];

  const lockedPicks = picksWithGame.filter((pick) => isGameLocked(pick.game.startDate));
  logger.debug("notification picks loaded", {
    pick_count: picks.length,
    matched_game_count: picksWithGame.length,
    locked_pick_count: lockedPicks.length,
  });

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

  let emailsSent = 0;
  let notificationsRecorded = 0;

  for (const user of usersToNotify) {
    await withLogContext({ user_id: user.id }, async () => {
      if (user.picksToSend.length === 0) {
        logger.debug("notification email not required", { email: user.email });
        return;
      }

      const pickIds = user.picksToSend.map((pick) => pick.id);
      const emailHtml = await render(NotificationEmail({ picks: user.picksToSend }));

      logger.info("notification email sending", {
        email: user.email,
        pick_count: user.picksToSend.length,
        pick_ids: pickIds,
      });

      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "CFB picks have been locked",
        html: emailHtml,
      });

      emailsSent += 1;
      logger.info("notification email sent", {
        email: user.email,
        pick_count: user.picksToSend.length,
      });

      for (const pick of user.picksToSend) {
        await db.insert(pickNotifications).values({
          pickId: pick.id,
          userId: user.id,
        });
        notificationsRecorded += 1;
      }

      logger.debug("pick notifications recorded", {
        pick_count: user.picksToSend.length,
        pick_ids: pickIds,
      });
    });
  }

  logger.info("notification poll completed", {
    duration_ms: Date.now() - startedAt,
    eligible_user_count: usersToNotify.length,
    email_count: emailsSent,
    notification_count: notificationsRecorded,
  });
}

async function main(): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    throw new Error("SMTP is not configured");
  }

  logger.info("notifier starting", {
    smtp_host: env.SMTP_HOST,
    smtp_port: env.SMTP_PORT,
    poll_interval_ms: pollIntervalMs,
  });

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
  logger.info("smtp connection verified", {
    smtp_host: env.SMTP_HOST,
    smtp_port: env.SMTP_PORT,
  });

  while (true) {
    await pollForNotifications(transporter);
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

try {
  await main();
} catch (error) {
  logger.critical("notifier stopped unexpectedly", { error });
  throw error;
}
