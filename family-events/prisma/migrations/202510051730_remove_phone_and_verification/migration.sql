-- Remove phone verification table and phone fields from users
-- Safe to run multiple times

-- Drop PhoneVerification table if it exists
DROP TABLE IF EXISTS "PhoneVerification";

-- Drop phone-related columns from User table if they exist
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "phone",
  DROP COLUMN IF EXISTS "phoneVerified";
