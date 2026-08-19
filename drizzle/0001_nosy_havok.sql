CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`type` enum('stress','irrigation','rainfall','data_quality','daily_summary') NOT NULL,
	`severity` enum('optimal','mild','moderate','severe') NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cropGrowthStages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cropId` int NOT NULL,
	`stageName` varchar(80) NOT NULL,
	`startDay` int NOT NULL,
	`endDay` int NOT NULL,
	`waterSensitivity` int NOT NULL,
	`preferredMoistureMin` float,
	`preferredMoistureMax` float,
	CONSTRAINT `cropGrowthStages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`variety` varchar(120),
	`waterRequirement` varchar(64),
	`growthDurationDays` int,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `crops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `farms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`location` varchar(255),
	`areaHectares` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `farms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`farmId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`cropType` varchar(120) NOT NULL,
	`cropStage` enum('establishment','vegetative','flowering','maturity') NOT NULL DEFAULT 'vegetative',
	`areaHectares` float NOT NULL,
	`soilType` varchar(120) NOT NULL,
	`latitude` float NOT NULL,
	`longitude` float NOT NULL,
	`irrigationMethod` enum('drip','sprinkler','flood','other') NOT NULL DEFAULT 'drip',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `irrigationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`durationMinutes` int NOT NULL,
	`waterVolumeLiters` float NOT NULL,
	`method` enum('drip','sprinkler','flood','other') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `irrigationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyStressSummaryEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preference_user_unq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`stressScoreId` int,
	`reasoning` text NOT NULL,
	`suggestedWaterVolume` varchar(160) NOT NULL,
	`optimalTimingWindow` varchar(160) NOT NULL,
	`irrigationMethod` varchar(80) NOT NULL,
	`confidence` int NOT NULL,
	`source` enum('rule','llm') NOT NULL DEFAULT 'rule',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduledJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobKey` varchar(80) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`lastRunDate` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduledJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduledJobs_jobKey_unique` UNIQUE(`jobKey`)
);
--> statement-breakpoint
CREATE TABLE `sensorReadings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sensorId` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`soilMoisture` float NOT NULL,
	`temperatureC` float NOT NULL,
	`humidityPercent` float NOT NULL,
	CONSTRAINT `sensorReadings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`sensorType` varchar(80) NOT NULL,
	`deviceId` varchar(120) NOT NULL,
	`status` enum('active','offline','maintenance') NOT NULL DEFAULT 'active',
	`lastSeenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sensors_id` PRIMARY KEY(`id`),
	CONSTRAINT `sensor_device_unq` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `stressScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`score` int NOT NULL,
	`riskLevel` enum('optimal','mild','moderate','severe') NOT NULL,
	`confidence` int NOT NULL,
	`factorsJson` text,
	CONSTRAINT `stressScores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weatherRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`temperatureC` float NOT NULL,
	`humidityPercent` float NOT NULL,
	`rainfallMm` float NOT NULL DEFAULT 0,
	`windSpeedKph` float NOT NULL DEFAULT 0,
	`forecastRainfallMm` float NOT NULL DEFAULT 0,
	`forecastJson` text,
	CONSTRAINT `weatherRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','agronomist') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cropGrowthStages` ADD CONSTRAINT `cropGrowthStages_cropId_crops_id_fk` FOREIGN KEY (`cropId`) REFERENCES `crops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farms` ADD CONSTRAINT `farms_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fields` ADD CONSTRAINT `fields_farmId_farms_id_fk` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `irrigationEvents` ADD CONSTRAINT `irrigationEvents_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD CONSTRAINT `notificationPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_stressScoreId_stressScores_id_fk` FOREIGN KEY (`stressScoreId`) REFERENCES `stressScores`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sensorReadings` ADD CONSTRAINT `sensorReadings_sensorId_sensors_id_fk` FOREIGN KEY (`sensorId`) REFERENCES `sensors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sensors` ADD CONSTRAINT `sensors_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stressScores` ADD CONSTRAINT `stressScores_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weatherRecords` ADD CONSTRAINT `weatherRecords_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `alerts_field_time_idx` ON `alerts` (`fieldId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `growth_stage_crop_idx` ON `cropGrowthStages` (`cropId`);--> statement-breakpoint
CREATE INDEX `farms_user_idx` ON `farms` (`userId`);--> statement-breakpoint
CREATE INDEX `fields_farm_idx` ON `fields` (`farmId`);--> statement-breakpoint
CREATE INDEX `irrigation_field_time_idx` ON `irrigationEvents` (`fieldId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `recommendation_field_time_idx` ON `recommendations` (`fieldId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sensor_readings_sensor_time_idx` ON `sensorReadings` (`sensorId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `sensor_field_idx` ON `sensors` (`fieldId`);--> statement-breakpoint
CREATE INDEX `stress_field_time_idx` ON `stressScores` (`fieldId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `weather_field_time_idx` ON `weatherRecords` (`fieldId`,`recordedAt`);