ALTER TABLE "license_plates" ALTER COLUMN "category_emoji" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" DROP COLUMN "views_count";--> statement-breakpoint
ALTER TABLE "license_plates" DROP COLUMN "shares_count";