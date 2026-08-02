CREATE TABLE "income_streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"currency" "currency" DEFAULT 'GBP' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "income_streams" ADD CONSTRAINT "income_streams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "income_streams_user_id_idx" ON "income_streams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "income_streams_user_id_month_idx" ON "income_streams" USING btree ("user_id","month");