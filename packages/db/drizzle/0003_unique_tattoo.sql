CREATE TABLE `cfb-picks_pick_notification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pickId` integer NOT NULL,
	`userId` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`pickId`) REFERENCES `cfb-picks_pick`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `cfb-picks_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `cfb-picks_user` ADD `sendNotifications` integer DEFAULT false NOT NULL;