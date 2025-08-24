PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cfb-picks_user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`emailVerified` integer,
	`image` text(255),
	`teamId` integer NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `cfb-picks_team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_cfb-picks_user`("id", "name", "email", "emailVerified", "image", "teamId") SELECT "id", "name", "email", "emailVerified", "image", "teamId" FROM `cfb-picks_user`;--> statement-breakpoint
DROP TABLE `cfb-picks_user`;--> statement-breakpoint
ALTER TABLE `__new_cfb-picks_user` RENAME TO `cfb-picks_user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;