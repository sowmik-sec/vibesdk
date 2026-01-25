CREATE TABLE `project_images` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`user_id` text NOT NULL,
	`file_path` text NOT NULL,
	`original_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`hash` text NOT NULL,
	`width` integer,
	`height` integer,
	`format` text NOT NULL,
	`is_optimized` integer DEFAULT false,
	`original_size_bytes` integer,
	`compression_ratio` real,
	`is_background_image` integer DEFAULT false,
	`usage_count` integer DEFAULT 0,
	`last_referenced_at` integer,
	`deleted_at` integer,
	`deleted_by` text,
	`uploaded_at` integer DEFAULT CURRENT_TIMESTAMP,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_images_app_id_idx` ON `project_images` (`app_id`);--> statement-breakpoint
CREATE INDEX `project_images_user_id_idx` ON `project_images` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_images_hash_idx` ON `project_images` (`hash`);--> statement-breakpoint
CREATE INDEX `project_images_deleted_at_idx` ON `project_images` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `project_images_uploaded_at_idx` ON `project_images` (`uploaded_at`);--> statement-breakpoint
CREATE INDEX `project_images_last_referenced_at_idx` ON `project_images` (`last_referenced_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_images_file_path_idx` ON `project_images` (`file_path`);