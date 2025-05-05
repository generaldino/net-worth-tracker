ALTER TABLE "license_plates" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "license_plates" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "license_plates" ALTER COLUMN "image_urls" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "license_plates" ALTER COLUMN "tags" SET DATA TYPE text[];