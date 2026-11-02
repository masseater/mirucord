CREATE TABLE `audit_entry` (
	`id` text PRIMARY KEY,
	`actionType` integer NOT NULL,
	`userId` text,
	`targetId` text,
	`at` integer NOT NULL,
	`sealed` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entry_at_idx` ON `audit_entry` (`at`);--> statement-breakpoint
CREATE INDEX `audit_entry_user_idx` ON `audit_entry` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_entry_target_idx` ON `audit_entry` (`targetId`);