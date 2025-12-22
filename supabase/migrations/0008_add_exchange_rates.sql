CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"base_currency" "public"."currency" DEFAULT 'GBP' NOT NULL,
	"gbp_rate" numeric DEFAULT '1' NOT NULL,
	"eur_rate" numeric NOT NULL,
	"usd_rate" numeric NOT NULL,
	"aed_rate" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_date_unique" UNIQUE("date")
);

