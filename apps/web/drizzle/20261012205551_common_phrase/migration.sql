CREATE TABLE `common_phrase` (
	`phrase` text NOT NULL,
	`guildId` text NOT NULL,
	CONSTRAINT `common_phrase_pk` PRIMARY KEY(`phrase`, `guildId`),
	CONSTRAINT `fk_common_phrase_guildId_guild_id_fk` FOREIGN KEY (`guildId`) REFERENCES `guild`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `common_phrase_guild_idx` ON `common_phrase` (`guildId`);