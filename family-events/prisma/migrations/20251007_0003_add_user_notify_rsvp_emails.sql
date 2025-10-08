-- Add missing notifyRsvpEmails column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyRsvpEmails" BOOLEAN NOT NULL DEFAULT true;

