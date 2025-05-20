CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"license_plate_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_license_plate_id_license_plates_id_fk" FOREIGN KEY ("license_plate_id") REFERENCES "public"."license_plates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plates" DROP COLUMN "image_urls";