-- Migration: Backdate cashIn and cashOut to include income and expenditure
-- This changes the data model so that:
--   - cashIn = total money in (including income)
--   - cashOut = total money out (including expenditure)
--   - income and expenditure are tracked separately for categorization

-- Update cashIn to include income (for all existing entries)
UPDATE "monthly_entries"
SET 
  "cash_in" = "cash_in" + COALESCE("income", 0)
WHERE 
  "income" IS NOT NULL 
  AND "income" != 0;

-- Update cashOut to include expenditure (for all existing entries)
UPDATE "monthly_entries"
SET 
  "cash_out" = "cash_out" + COALESCE("expenditure", 0)
WHERE 
  "expenditure" IS NOT NULL 
  AND "expenditure" != 0;

-- Note: The cashFlow calculation in the application code will also need to be updated
-- from: cashFlow = cashIn - cashOut + income
-- to:   cashFlow = cashIn - cashOut


