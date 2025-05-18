CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "countries_name_unique" UNIQUE("name")
);
--> statement-breakpoint

ALTER TABLE "license_plates" DROP COLUMN "country";