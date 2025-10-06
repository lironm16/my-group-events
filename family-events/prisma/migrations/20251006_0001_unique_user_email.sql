-- Add unique index on User.email (nullable)
-- In Postgres, multiple NULLs are allowed; Prisma @unique on nullable field creates a unique index.
-- For portability, we create a partial unique index to ensure uniqueness only for non-null emails.

-- Up
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'User_email_unique_not_null_idx'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "User_email_unique_not_null_idx" ON "User" (LOWER("email")) WHERE email IS NOT NULL';
  END IF;
END $$;

-- Down
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'User_email_unique_not_null_idx'
  ) THEN
    EXECUTE 'DROP INDEX "User_email_unique_not_null_idx"';
  END IF;
END $$;
