CREATE TABLE `member` (
	`userId` text PRIMARY KEY,
	`sealed` text NOT NULL,
	`roles` text NOT NULL,
	`bot` integer NOT NULL,
	`joinedAt` integer,
	`leftAt` integer,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `member_joined_idx` ON `member` (`joinedAt`);