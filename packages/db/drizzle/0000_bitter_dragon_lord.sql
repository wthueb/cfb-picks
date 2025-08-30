CREATE TABLE `cfb-picks_account` (
	`userId` text(255) NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`providerAccountId` text(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text(255),
	`scope` text(255),
	`id_token` text,
	`session_state` text(255),
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `cfb-picks_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `cfb-picks_account` (`userId`);--> statement-breakpoint
CREATE TABLE `cfb-picks_pick` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`season` integer NOT NULL,
	`week` integer NOT NULL,
	`gameId` integer NOT NULL,
	`pickType` text NOT NULL,
	`duration` text NOT NULL,
	`odds` integer NOT NULL,
	`double` integer NOT NULL,
	`total` real,
	`spread` real,
	`cfbTeamId` integer,
	`createdAt` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`userId`) REFERENCES `cfb-picks_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cfb-picks_session` (
	`sessionToken` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `cfb-picks_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `cfb-picks_session` (`userId`);--> statement-breakpoint
CREATE TABLE `cfb-picks_team` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cfb-picks_user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`emailVerified` integer,
	`image` text(255),
	`teamId` integer,
	FOREIGN KEY (`teamId`) REFERENCES `cfb-picks_team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cfb-picks_verification_token` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
