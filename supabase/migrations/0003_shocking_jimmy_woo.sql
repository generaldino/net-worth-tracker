ALTER TABLE "expense_categories" ADD COLUMN "monthly_target" numeric;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "is_fixed" boolean DEFAULT false NOT NULL;