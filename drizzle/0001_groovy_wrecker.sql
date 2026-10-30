CREATE TABLE `community_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerId` int NOT NULL,
	`blockedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_block_pair_unique` UNIQUE(`blockerId`,`blockedId`)
);
--> statement-breakpoint
CREATE TABLE `community_profiles` (
	`userId` int NOT NULL,
	`alias` varchar(24) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_profiles_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `community_alias_unique` UNIQUE(`alias`)
);
--> statement-breakpoint
CREATE TABLE `community_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`targetType` enum('story','message') NOT NULL,
	`targetId` int NOT NULL,
	`reason` enum('gambling','harassment','spam','other') NOT NULL,
	`status` enum('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_report_once_unique` UNIQUE(`reporterId`,`targetType`,`targetId`)
);
--> statement-breakpoint
CREATE TABLE `community_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`circleId` int,
	`audience` enum('circle','public') NOT NULL,
	`body` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`deletedAt` timestamp,
	CONSTRAINT `community_stories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_circles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(60) NOT NULL,
	`inviteCode` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_circles_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_circle_invite_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `support_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_member_unique` UNIQUE(`circleId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` varchar(1200) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `community_blocks` ADD CONSTRAINT `community_blocks_blockerId_users_id_fk` FOREIGN KEY (`blockerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_blocks` ADD CONSTRAINT `community_blocks_blockedId_users_id_fk` FOREIGN KEY (`blockedId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_profiles` ADD CONSTRAINT `community_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_reports` ADD CONSTRAINT `community_reports_reporterId_users_id_fk` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_stories` ADD CONSTRAINT `community_stories_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_stories` ADD CONSTRAINT `community_stories_circleId_support_circles_id_fk` FOREIGN KEY (`circleId`) REFERENCES `support_circles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_circles` ADD CONSTRAINT `support_circles_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_members` ADD CONSTRAINT `support_members_circleId_support_circles_id_fk` FOREIGN KEY (`circleId`) REFERENCES `support_circles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_members` ADD CONSTRAINT `support_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_circleId_support_circles_id_fk` FOREIGN KEY (`circleId`) REFERENCES `support_circles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_report_status_idx` ON `community_reports` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_story_feed_idx` ON `community_stories` (`audience`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `community_story_circle_idx` ON `community_stories` (`circleId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `support_member_user_idx` ON `support_members` (`userId`);--> statement-breakpoint
CREATE INDEX `support_message_circle_time_idx` ON `support_messages` (`circleId`,`createdAt`);