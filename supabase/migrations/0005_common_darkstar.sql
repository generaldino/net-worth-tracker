ALTER TABLE "license_plates" ALTER COLUMN "caption" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "country" text;