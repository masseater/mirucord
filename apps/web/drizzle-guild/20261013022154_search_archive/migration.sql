CREATE TABLE `search_archive` (
	`name` text PRIMARY KEY,
	`status` text NOT NULL,
	`shards` integer NOT NULL,
	`count` integer NOT NULL,
	`pieces` text NOT NULL,
	`sources` text NOT NULL,
	`nextShard` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_channel` (
	`id` text PRIMARY KEY,
	`position` integer NOT NULL UNIQUE
);
--> statement-breakpoint
DELETE FROM `search_invalid`;--> statement-breakpoint
DELETE FROM `search_segment`;
