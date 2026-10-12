PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `message_search`;--> statement-breakpoint
CREATE TABLE `__new_message` (
	`seq` integer PRIMARY KEY,
	`id` text NOT NULL UNIQUE,
	`channelId` text NOT NULL,
	`authorId` text NOT NULL,
	`sealed` text NOT NULL,
	`createdAt` integer NOT NULL,
	`editedAt` integer,
	`describedWith` text
);
--> statement-breakpoint
DROP TABLE `message`;--> statement-breakpoint
ALTER TABLE `__new_message` RENAME TO `message`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `message_channel_created_idx` ON `message` (`channelId`,`createdAt`);--> statement-breakpoint
CREATE VIRTUAL TABLE `message_search` USING fts5(`tokens`, content='', contentless_delete=1, detail=none, tokenize='ascii');
