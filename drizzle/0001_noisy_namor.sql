CREATE TABLE `client_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`credits` int NOT NULL DEFAULT 0,
	`deviceFingerprint` varchar(512),
	`deviceIP` varchar(64),
	`deviceLockedAt` timestamp,
	`label` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLoginAt` timestamp,
	CONSTRAINT `client_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_credentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`credentialId` int NOT NULL,
	`amount` int NOT NULL,
	`reason` text,
	`adminUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `download_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`credentialId` int NOT NULL,
	`fileId` int NOT NULL,
	`downloadedAt` timestamp NOT NULL DEFAULT (now()),
	`ip` varchar(64),
	CONSTRAINT `download_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(256) NOT NULL,
	`originalName` varchar(256) NOT NULL,
	`s3Key` varchar(512) NOT NULL,
	`s3Url` text NOT NULL,
	`fileSize` bigint,
	`mimeType` varchar(128),
	`uploadAdminId` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
