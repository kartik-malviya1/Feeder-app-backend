CREATE TABLE `admins_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admins_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_table_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `auto_rider` ADD `vehicleType` varchar(20);--> statement-breakpoint
ALTER TABLE `auto_rider` ADD `rcPhotoUrl` varchar(255);--> statement-breakpoint
ALTER TABLE `auto_rider` ADD `isApproved` boolean DEFAULT false NOT NULL;