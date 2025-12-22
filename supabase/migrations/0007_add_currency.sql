CREATE TYPE "public"."currency" AS ENUM('GBP', 'EUR', 'USD', 'AED');--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "currency" "public"."currency" DEFAULT 'GBP' NOT NULL;

