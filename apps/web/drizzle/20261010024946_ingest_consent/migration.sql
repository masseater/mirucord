CREATE TABLE `ingest_consent` (
	`guildId` text PRIMARY KEY,
	`grantedBy` text NOT NULL,
	`grantedAt` integer NOT NULL,
	`channelIds` text NOT NULL,
	`noticeChannelId` text NOT NULL,
	CONSTRAINT `fk_ingest_consent_guildId_guild_id_fk` FOREIGN KEY (`guildId`) REFERENCES `guild`(`id`) ON DELETE CASCADE
);
