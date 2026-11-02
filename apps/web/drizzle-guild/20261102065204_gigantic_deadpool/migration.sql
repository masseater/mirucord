CREATE TABLE `voice_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`userId` text NOT NULL,
	`channelId` text NOT NULL,
	`joinedAt` integer NOT NULL,
	`joinPrecision` text NOT NULL,
	`leftAt` integer,
	`leavePrecision` text
);
--> statement-breakpoint
CREATE INDEX `voice_session_user_idx` ON `voice_session` (`userId`,`leftAt`);--> statement-breakpoint
CREATE INDEX `voice_session_joined_idx` ON `voice_session` (`joinedAt`);