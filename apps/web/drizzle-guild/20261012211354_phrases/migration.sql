CREATE TABLE `phrase_ledger` (
	`id` integer PRIMARY KEY,
	`guildId` text,
	`written` integer NOT NULL,
	`generation` integer NOT NULL,
	`backfillRequestedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `phrase_stats` (
	`visibility` text PRIMARY KEY,
	`body` text NOT NULL,
	`written` integer NOT NULL,
	`computedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `phrase_use` (
	`messageId` text NOT NULL,
	`phrase` text NOT NULL,
	`common` text NOT NULL,
	`channelId` text NOT NULL,
	`authorId` text NOT NULL,
	`createdAt` integer NOT NULL,
	CONSTRAINT `phrase_use_pk` PRIMARY KEY(`messageId`, `phrase`)
);
--> statement-breakpoint
ALTER TABLE `message` ADD `phrases` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE INDEX `message_phrases_created_idx` ON `message` (`phrases`,`createdAt`);--> statement-breakpoint
CREATE INDEX `phrase_use_created_idx` ON `phrase_use` (`createdAt`);--> statement-breakpoint
CREATE INDEX `phrase_use_phrase_idx` ON `phrase_use` (`phrase`,`createdAt`);--> statement-breakpoint
CREATE INDEX `phrase_use_author_idx` ON `phrase_use` (`authorId`);--> statement-breakpoint
CREATE INDEX `phrase_use_channel_idx` ON `phrase_use` (`channelId`);