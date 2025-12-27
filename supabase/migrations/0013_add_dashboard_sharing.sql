-- Migration: Add dashboard sharing tables
-- Enables users to invite others to view their wealth tracker dashboard

-- Create dashboard_shares table to track shared dashboards
CREATE TABLE "dashboard_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"shared_with_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_shares_owner_id_shared_with_user_id_unique" UNIQUE("owner_id", "shared_with_user_id")
);
--> statement-breakpoint

-- Create dashboard_invitations table to track pending invitations
CREATE TABLE "dashboard_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"invitee_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp
);
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "dashboard_invitations" ADD CONSTRAINT "dashboard_invitations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "dashboard_shares_owner_id_idx" ON "dashboard_shares"("owner_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dashboard_shares_shared_with_user_id_idx" ON "dashboard_shares"("shared_with_user_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dashboard_invitations_owner_id_idx" ON "dashboard_invitations"("owner_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dashboard_invitations_invitee_email_idx" ON "dashboard_invitations"("invitee_email");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dashboard_invitations_status_idx" ON "dashboard_invitations"("status");

