CREATE TABLE `thread_member` (
	`threadId` text NOT NULL,
	`userId` text NOT NULL,
	`joinedAt` integer NOT NULL,
	`leftAt` integer,
	CONSTRAINT `thread_member_pk` PRIMARY KEY(`threadId`, `userId`)
);
--> statement-breakpoint
CREATE INDEX `thread_member_user_idx` ON `thread_member` (`userId`);