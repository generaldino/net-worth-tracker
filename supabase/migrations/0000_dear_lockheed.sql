CREATE TABLE "license_plates" (
	"id" text PRIMARY KEY NOT NULL,
	"plate_number" text NOT NULL,
	"image_urls" text NOT NULL,
	"date_added" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"tags" text NOT NULL,
	"reporter" text NOT NULL
);
