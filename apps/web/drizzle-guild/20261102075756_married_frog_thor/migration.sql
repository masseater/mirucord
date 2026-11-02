CREATE TABLE `event_interest` (
	`eventId` text NOT NULL,
	`userId` text NOT NULL,
	`interestedAt` integer NOT NULL,
	CONSTRAINT `event_interest_pk` PRIMARY KEY(`eventId`, `userId`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_event` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`channelId` text,
	`creatorId` text,
	`location` text,
	`entityType` integer NOT NULL,
	`status` integer NOT NULL,
	`startsAt` integer NOT NULL,
	`endsAt` integer,
	`recurring` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`removedAt` integer
);
--> statement-breakpoint
CREATE INDEX `event_interest_user_idx` ON `event_interest` (`userId`);--> statement-breakpoint
CREATE INDEX `scheduled_event_start_idx` ON `scheduled_event` (`startsAt`);--> statement-breakpoint
CREATE INDEX `scheduled_event_creator_idx` ON `scheduled_event` (`creatorId`);