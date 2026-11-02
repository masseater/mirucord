CREATE TABLE `poll_vote` (
	`messageId` text NOT NULL,
	`channelId` text NOT NULL,
	`userId` text NOT NULL,
	`answerId` integer NOT NULL,
	`votedAt` integer NOT NULL,
	CONSTRAINT `poll_vote_pk` PRIMARY KEY(`messageId`, `userId`, `answerId`)
);
--> statement-breakpoint
CREATE TABLE `reaction` (
	`messageId` text NOT NULL,
	`channelId` text NOT NULL,
	`userId` text NOT NULL,
	`messageAuthorId` text,
	`emoji` text NOT NULL,
	`burst` integer NOT NULL,
	`reactedAt` integer NOT NULL,
	CONSTRAINT `reaction_pk` PRIMARY KEY(`messageId`, `userId`, `emoji`, `burst`)
);
--> statement-breakpoint
CREATE INDEX `poll_vote_user_idx` ON `poll_vote` (`userId`,`votedAt`);--> statement-breakpoint
CREATE INDEX `reaction_user_idx` ON `reaction` (`userId`,`reactedAt`);--> statement-breakpoint
CREATE INDEX `reaction_author_idx` ON `reaction` (`messageAuthorId`,`reactedAt`);--> statement-breakpoint
CREATE INDEX `reaction_at_idx` ON `reaction` (`reactedAt`);