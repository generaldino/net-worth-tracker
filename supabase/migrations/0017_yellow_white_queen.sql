CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"color" text DEFAULT 'amber' NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "category_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plates" ADD CONSTRAINT "license_plates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plates" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "license_plates" DROP COLUMN "category_emoji";--> statement-breakpoint
ALTER TABLE "license_plates" DROP COLUMN "category_color";