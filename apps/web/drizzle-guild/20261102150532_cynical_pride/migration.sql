DROP INDEX IF EXISTS `audit_entry_at_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `audit_entry_user_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `audit_entry_target_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `event_interest_user_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `scheduled_event_start_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `scheduled_event_creator_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `thread_member_user_idx`;--> statement-breakpoint
DROP TABLE `audit_entry`;--> statement-breakpoint
DROP TABLE `event_interest`;--> statement-breakpoint
DROP TABLE `scheduled_event`;--> statement-breakpoint
DROP TABLE `thread_member`;