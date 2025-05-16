CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_plate_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_license_plate_id_license_plates_id_fk" FOREIGN KEY ("license_plate_id") REFERENCES "public"."license_plates"("id") ON DELETE no action ON UPDATE no action;