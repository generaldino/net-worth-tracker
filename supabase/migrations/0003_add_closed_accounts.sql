-- Add isClosed and closedAt columns to accounts table
ALTER TABLE "public"."accounts"
ADD COLUMN "is_closed" boolean NOT NULL DEFAULT false,
ADD COLUMN "closed_at" timestamp with time zone; 