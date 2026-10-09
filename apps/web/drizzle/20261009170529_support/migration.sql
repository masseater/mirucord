CREATE TABLE `support_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`guildId` text NOT NULL,
	`operatorId` text NOT NULL,
	`tool` text NOT NULL,
	`channelId` text,
	`accessedAt` integer NOT NULL,
	CONSTRAINT `fk_support_access_guildId_guild_id_fk` FOREIGN KEY (`guildId`) REFERENCES `guild`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_support_access_channelId_channel_id_fk` FOREIGN KEY (`channelId`) REFERENCES `channel`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `support_grant` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`guildId` text NOT NULL,
	`grantedBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	`revokedAt` integer,
	CONSTRAINT `fk_support_grant_guildId_guild_id_fk` FOREIGN KEY (`guildId`) REFERENCES `guild`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `support_access_guild_id_idx` ON `support_access` (`guildId`,`accessedAt`);--> statement-breakpoint
CREATE INDEX `support_grant_guild_id_idx` ON `support_grant` (`guildId`,`expiresAt`);