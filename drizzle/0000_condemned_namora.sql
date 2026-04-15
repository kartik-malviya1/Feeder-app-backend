CREATE TABLE `auto_rider` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`vehicleNumber` varchar(20),
	`licenseNumber` varchar(20),
	`licensePhotoUrl` varchar(255),
	`AadhaarCardPhotoUrl` varchar(255),
	`photoUrl` varchar(255),
	`lastlogin` timestamp,
	`driver_status` enum('OFFLINE','ONLINE','BUSY') NOT NULL,
	`rating` float,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`currentLat` float,
	`currentLng` float,
	CONSTRAINT `auto_rider_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`autoRiderId` bigint unsigned,
	`pickupLocationLat` float NOT NULL,
	`pickupLocationLng` float NOT NULL,
	`dropLocationLat` float,
	`dropLocationLng` float,
	`otp` int NOT NULL,
	`ride_status` enum('REQUESTED','ACCEPTED','STARTED','COMPLETED','CANCELLED') NOT NULL,
	`paymentMode` varchar(20) NOT NULL,
	`paymentStatus` varchar(20) NOT NULL,
	`paymentUTR` varchar(255),
	`paymentReferenceId` varchar(255),
	`price` float NOT NULL,
	`started_at` timestamp,
	`completed_at` timestamp,
	`distance` float,
	`duration` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phoneNumber` varchar(20) NOT NULL,
	`deviceId` varchar(255),
	`expoToken` varchar(255),
	`lastlogin` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_table_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_userId_users_table_id_fk` FOREIGN KEY (`userId`) REFERENCES `users_table`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_autoRiderId_auto_rider_id_fk` FOREIGN KEY (`autoRiderId`) REFERENCES `auto_rider`(`id`) ON DELETE no action ON UPDATE no action;