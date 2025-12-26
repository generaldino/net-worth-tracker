ALTER TABLE "monthly_entries" RENAME COLUMN "work_income" TO "income";--> statement-breakpoint
ALTER TABLE "monthly_entries" ADD COLUMN "expenditure" numeric DEFAULT '0' NOT NULL;