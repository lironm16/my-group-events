-- Create EventSeries table to manage recurring event schedules
CREATE TABLE IF NOT EXISTS "EventSeries" (
  "id" TEXT PRIMARY KEY,
  "frequency" TEXT NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "skipHolidays" BOOLEAN NOT NULL DEFAULT FALSE,
  "until" TIMESTAMP(3),
  "noEndDate" BOOLEAN NOT NULL DEFAULT FALSE,
  "templateData" JSONB NOT NULL,
  "baseDurationMs" BIGINT,
  "nextOccurrenceStart" TIMESTAMP(3),
  "nextOccurrenceEnd" TIMESTAMP(3),
  "nextReadyAt" TIMESTAMP(3),
  "ownerId" TEXT,
  "familyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure update timestamp keeps current behaviour
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_timestamp_event_series ON "EventSeries";
CREATE TRIGGER set_timestamp_event_series
BEFORE UPDATE ON "EventSeries"
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- Add foreign keys for EventSeries ownership
ALTER TABLE "EventSeries"
  ADD CONSTRAINT "EventSeries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL;

ALTER TABLE "EventSeries"
  ADD CONSTRAINT "EventSeries_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "EventSeries_nextReadyAt_idx" ON "EventSeries" ("nextReadyAt");

-- Extend Event table with recurrence linkage fields
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "seriesId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "seriesOccurrence" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "generatedFromEventId" TEXT;

ALTER TABLE "Event"
  ADD CONSTRAINT IF NOT EXISTS "Event_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL;

ALTER TABLE "Event"
  ADD CONSTRAINT IF NOT EXISTS "Event_generatedFromEventId_fkey" FOREIGN KEY ("generatedFromEventId") REFERENCES "Event"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Event_seriesId_idx" ON "Event" ("seriesId");
CREATE INDEX IF NOT EXISTS "Event_generatedFromEventId_idx" ON "Event" ("generatedFromEventId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Event_seriesId_seriesOccurrence_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "Event_seriesId_seriesOccurrence_key" ON "Event" ("seriesId", "seriesOccurrence") WHERE "seriesId" IS NOT NULL';
  END IF;
END $$;
