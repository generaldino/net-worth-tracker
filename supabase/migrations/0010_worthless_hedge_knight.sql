ALTER TABLE "license_plates" ADD COLUMN "category" text NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "category_emoji" text;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "views_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "shares_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "user_id" uuid;