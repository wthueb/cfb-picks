PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cfb-picks_pick_notification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pickId` integer NOT NULL,
	`userId` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`pickId`) REFERENCES `cfb-picks_pick`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `cfb-picks_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_cfb-picks_pick_notification`("id", "pickId", "userId", "createdAt") SELECT "id", "pickId", "userId", "createdAt" FROM `cfb-picks_pick_notification`;--> statement-breakpoint
DROP TABLE `cfb-picks_pick_notification`;--> statement-breakpoint
ALTER TABLE `__new_cfb-picks_pick_notification` RENAME TO `cfb-picks_pick_notification`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_cfb-picks_pick` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teamId` integer NOT NULL,
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
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `cfb-picks_team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_cfb-picks_pick`("id", "teamId", "season", "week", "gameId", "pickType", "duration", "odds", "double", "total", "spread", "cfbTeamId", "createdAt") SELECT "id", "teamId", "season", "week", "gameId", "pickType", "duration", "odds", "double", "total", "spread", "cfbTeamId", "createdAt" FROM `cfb-picks_pick`;--> statement-breakpoint
DROP TABLE `cfb-picks_pick`;--> statement-breakpoint
ALTER TABLE `__new_cfb-picks_pick` RENAME TO `cfb-picks_pick`;