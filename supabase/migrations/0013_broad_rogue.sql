ALTER TABLE "license_plates" ADD COLUMN "country" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "caption" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "image_urls" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "tags" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "reporter" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "car_make" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "car_model" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "category" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "category_emoji" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "user_id" uuid;