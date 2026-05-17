-- Prevent balance from going negative at database level
-- This is a safety net — application code already checks, but this prevents bugs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_balance_non_negative'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_balance_non_negative" CHECK (balance >= 0);
  END IF;
END $$;
