CREATE TABLE `message` (
	`seq` integer PRIMARY KEY AUTOINCREMENT,
	`id` text NOT NULL UNIQUE,
	`channelId` text NOT NULL,
	`authorId` text NOT NULL,
	`sealed` text NOT NULL,
	`createdAt` integer NOT NULL,
	`editedAt` integer,
	`describedWith` text
);
--> statement-breakpoint
CREATE INDEX `message_channel_created_idx` ON `message` (`channelId`,`createdAt`);