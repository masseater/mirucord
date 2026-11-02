CREATE TABLE `invite` (
	`code` text PRIMARY KEY,
	`inviterId` text,
	`channelId` text,
	`uses` integer NOT NULL,
	`maxUses` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invite_join` (
	`userId` text NOT NULL,
	`joinedAt` integer NOT NULL,
	`precision` text NOT NULL,
	`candidates` text NOT NULL,
	CONSTRAINT `invite_join_pk` PRIMARY KEY(`userId`, `joinedAt`)
);
--> statement-breakpoint
CREATE TABLE `invite_snapshot` (
	`id` integer PRIMARY KEY,
	`fetchedAt` integer NOT NULL
);
