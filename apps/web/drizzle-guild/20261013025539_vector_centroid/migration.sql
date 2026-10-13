CREATE TABLE `vector_centroid` (
	`segment` text PRIMARY KEY,
	`through` integer NOT NULL,
	`sealed` blob NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vector_centroid_file` (
	`id` integer PRIMARY KEY,
	`stamp` integer NOT NULL
);
--> statement-breakpoint
UPDATE `search_segment` SET `vectorThrough` = NULL, `vectorClusters` = NULL;