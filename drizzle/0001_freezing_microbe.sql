PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`createdAt` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`teamId`) REFERENCES `cfb-picks_team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_cfb-picks_pick`("id", "teamId", "season", "week", "gameId", "pickType", "duration", "odds", "double", "total", "spread", "cfbTeamId", "createdAt") SELECT p.id, u.teamId, p.season, p.week, p.gameId, p.pickType, p.duration, p.odds, p.double, p.total, p.spread, p.cfbTeamId, p.createdAt FROM `cfb-picks_pick` p JOIN `cfb-picks_user` u ON p.userId = u.id;--> statement-breakpoint
DROP TABLE `cfb-picks_pick`;--> statement-breakpoint
ALTER TABLE `__new_cfb-picks_pick` RENAME TO `cfb-picks_pick`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
