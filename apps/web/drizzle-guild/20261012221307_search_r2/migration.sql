CREATE TABLE `search_invalid` (
	`segment` text NOT NULL,
	`ordinal` integer NOT NULL,
	`since` integer NOT NULL,
	CONSTRAINT `search_invalid_pk` PRIMARY KEY(`segment`, `ordinal`)
);
--> statement-breakpoint
CREATE TABLE `search_segment` (
	`name` text PRIMARY KEY,
	`kind` text NOT NULL,
	`fromCreatedAt` integer NOT NULL,
	`toCreatedAt` integer,
	`builtThrough` integer NOT NULL,
	`count` integer NOT NULL,
	`shards` integer NOT NULL,
	`ids` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `message` ADD `tokens` blob;--> statement-breakpoint
ALTER TABLE `message` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `message_created_idx` ON `message` (`createdAt`);--> statement-breakpoint
CREATE INDEX `message_version_idx` ON `message` (`version`);--> statement-breakpoint
DROP TABLE `message_search`;
