CREATE TABLE `phrase_note` (
	`phrase` text PRIMARY KEY,
	`status` text NOT NULL,
	`sealed` text,
	`examples` text NOT NULL,
	`updatedAt` integer NOT NULL
);
