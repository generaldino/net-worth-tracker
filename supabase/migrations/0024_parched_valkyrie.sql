CREATE TABLE "car_makes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "car_makes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "license_plates" ADD COLUMN "car_make_id" uuid;--> statement-breakpoint
ALTER TABLE "license_plates" ADD CONSTRAINT "license_plates_car_make_id_car_makes_id_fk" FOREIGN KEY ("car_make_id") REFERENCES "public"."car_makes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plates" DROP COLUMN "car_make";