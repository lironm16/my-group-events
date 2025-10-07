-- Drop username column from User table (safe if it already doesn't exist)
ALTER TABLE "User" DROP COLUMN IF EXISTS "username";

