CREATE TYPE "public"."account_category" AS ENUM('Cash', 'Investments');--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'Stock' BEFORE 'Pension';--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'Crypto' BEFORE 'Pension';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "category" "account_category" DEFAULT 'Investments' NOT NULL;