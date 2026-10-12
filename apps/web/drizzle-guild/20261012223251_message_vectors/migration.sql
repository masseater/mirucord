ALTER TABLE `message` ADD `vector` blob;--> statement-breakpoint
ALTER TABLE `message` ADD `vectorAt` integer;--> statement-breakpoint
ALTER TABLE `search_segment` ADD `vectorThrough` integer;--> statement-breakpoint
ALTER TABLE `search_segment` ADD `vectorClusters` integer;--> statement-breakpoint
CREATE INDEX `message_unembedded_idx` ON `message` (`createdAt`) WHERE ("message"."vector" is null);--> statement-breakpoint
CREATE INDEX `message_vector_at_idx` ON `message` (`vectorAt`);