CREATE TABLE `satelliteAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`indexType` enum('ndvi','ndwi') NOT NULL,
	`provider` varchar(80) NOT NULL,
	`overlayUrl` text NOT NULL,
	`boundsJson` text NOT NULL,
	`meanValue` float,
	`acquiredAt` timestamp,
	`cloudPercent` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `satelliteAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fields` ADD `boundaryGeoJson` text;--> statement-breakpoint
ALTER TABLE `satelliteAnalyses` ADD CONSTRAINT `satelliteAnalyses_fieldId_fields_id_fk` FOREIGN KEY (`fieldId`) REFERENCES `fields`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `satellite_analysis_field_idx` ON `satelliteAnalyses` (`fieldId`,`createdAt`);