CREATE TABLE "statement_coverage_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"month" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "statement_coverage_overrides" ADD CONSTRAINT "statement_coverage_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_coverage_overrides" ADD CONSTRAINT "statement_coverage_overrides_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "statement_coverage_overrides_account_month_unique" ON "statement_coverage_overrides" USING btree ("account_id","month");--> statement-breakpoint
CREATE INDEX "statement_coverage_overrides_user_month_idx" ON "statement_coverage_overrides" USING btree ("user_id","month");