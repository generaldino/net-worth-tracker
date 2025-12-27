-- Rename work_income column to income
ALTER TABLE "monthly_entries" RENAME COLUMN "work_income" TO "income";

-- Add expenditure column
ALTER TABLE "monthly_entries" ADD COLUMN "expenditure" numeric DEFAULT '0' NOT NULL;


