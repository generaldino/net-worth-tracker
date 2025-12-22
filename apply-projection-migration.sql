-- Migration: Create projection_scenarios table
-- This creates the table for storing wealth projection scenarios

CREATE TABLE IF NOT EXISTS "projection_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"monthly_income" numeric NOT NULL,
	"savings_rate" numeric NOT NULL,
	"time_period_months" integer NOT NULL,
	"growth_rates" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'projection_scenarios_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "projection_scenarios" 
        ADD CONSTRAINT "projection_scenarios_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") 
        ON DELETE cascade 
        ON UPDATE no action;
    END IF;
END $$;

