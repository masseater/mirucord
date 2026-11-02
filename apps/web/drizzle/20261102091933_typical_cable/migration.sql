CREATE TABLE `linked_account` (
	`userId` text NOT NULL,
	`discordUserId` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`verified` integer NOT NULL,
	`publishedAt` integer NOT NULL,
	CONSTRAINT `linked_account_pk` PRIMARY KEY(`discordUserId`, `type`, `name`),
	CONSTRAINT `fk_linked_account_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `linked_account_user_idx` ON `linked_account` (`userId`);