CREATE TYPE "public"."account_category" AS ENUM('Cash', 'Investments');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('Current', 'Savings', 'Investment', 'Stock', 'Crypto', 'Pension', 'Commodity', 'Stock_options', 'Credit_Card', 'Loan', 'Asset');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('GBP', 'EUR', 'USD', 'AED');--> statement-breakpoint
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
CREATE TABLE "dashboard_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"shared_with_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"base_currency" "currency" DEFAULT 'GBP' NOT NULL,
	"gbp_rate" numeric DEFAULT '1' NOT NULL,
	"eur_rate" numeric NOT NULL,
	"usd_rate" numeric NOT NULL,
	"aed_rate" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"category" "account_category" DEFAULT 'Investments' NOT NULL,
	"currency" "currency" DEFAULT 'GBP' NOT NULL,
	"is_isa" boolean DEFAULT false NOT NULL,
	"owner" text DEFAULT 'all' NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"month" text NOT NULL,
	"ending_balance" numeric NOT NULL,
	"cash_in" numeric NOT NULL,
	"cash_out" numeric NOT NULL,
	"income" numeric DEFAULT '0' NOT NULL,
	"expenditure" numeric DEFAULT '0' NOT NULL,
	"internal_transfers_out" numeric DEFAULT '0' NOT NULL,
	"debt_payments" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "next_auth_accounts" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "next_auth_accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "next_auth_sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "next_auth_verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "next_auth_verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "projection_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"monthly_income" numeric NOT NULL,
	"savings_rate" numeric NOT NULL,
	"time_period_months" integer NOT NULL,
	"growth_rates" jsonb NOT NULL,
	"savings_allocation" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"name" text,
	"image" text,
	"avatar_url" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "dashboard_invitations" ADD CONSTRAINT "dashboard_invitations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_shares" ADD CONSTRAINT "dashboard_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_entries" ADD CONSTRAINT "monthly_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_auth_accounts" ADD CONSTRAINT "next_auth_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_auth_sessions" ADD CONSTRAINT "next_auth_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projection_scenarios" ADD CONSTRAINT "projection_scenarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "monthly_entries_account_id_idx" ON "monthly_entries" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "monthly_entries_month_idx" ON "monthly_entries" USING btree ("month");--> statement-breakpoint
CREATE INDEX "monthly_entries_account_id_month_idx" ON "monthly_entries" USING btree ("account_id","month");