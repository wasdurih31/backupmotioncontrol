-- Add visibility column to tutorials table
-- Controls which account types can see each tutorial: 'all', 'byok', 'payg'
ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'all';
