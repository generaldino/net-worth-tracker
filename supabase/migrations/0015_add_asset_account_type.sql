-- Add "Asset" to account_type enum for tracking physical assets like vehicles, property, etc.
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'Asset';

