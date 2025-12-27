-- Migration: Add internal_transfers_out and debt_payments fields
-- These fields allow expenditure to be computed as: cashOut - internalTransfersOut - debtPayments

-- Add internal_transfers_out column
ALTER TABLE "monthly_entries" ADD COLUMN "internal_transfers_out" numeric NOT NULL DEFAULT '0';
--> statement-breakpoint

-- Add debt_payments column
ALTER TABLE "monthly_entries" ADD COLUMN "debt_payments" numeric NOT NULL DEFAULT '0';
--> statement-breakpoint

-- Note: expenditure will now be computed as: cashOut - internalTransfersOut - debtPayments
-- The expenditure column remains in the database for backwards compatibility and will be updated
-- by the application logic when entries are saved.

