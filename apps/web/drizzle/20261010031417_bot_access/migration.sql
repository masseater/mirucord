ALTER TABLE `channel` ADD `botAccess` text DEFAULT 'readable' NOT NULL;--> statement-breakpoint
ALTER TABLE `channel` ADD `hiddenAt` integer;