-- CreateEnum
CREATE TYPE "UnavailabilityScope" AS ENUM ('INDIVIDUAL', 'GROUP', 'FAMILY');

-- CreateEnum
CREATE TYPE "UnavailabilityStatus" AS ENUM ('ACTIVE', 'DRAFT', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UnavailabilityParticipantRole" AS ENUM ('PRIMARY', 'MEMBER');

-- CreateTable
CREATE TABLE "Unavailability" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "reason" TEXT,
    "scope" "UnavailabilityScope" NOT NULL DEFAULT 'INDIVIDUAL',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "rsvpNote" TEXT,
    "autoCancelHostedEvents" BOOLEAN NOT NULL DEFAULT false,
    "autoUpdateRsvps" BOOLEAN NOT NULL DEFAULT false,
    "status" "UnavailabilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "familyId" TEXT,
    "groupId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Unavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnavailabilityParticipant" (
    "id" TEXT NOT NULL,
    "unavailabilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UnavailabilityParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnavailabilityParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnavailabilityParticipant_unavailabilityId_userId_key" ON "UnavailabilityParticipant"("unavailabilityId", "userId");

-- CreateIndex
CREATE INDEX "UnavailabilityParticipant_userId_idx" ON "UnavailabilityParticipant"("userId");

-- CreateIndex
CREATE INDEX "UnavailabilityParticipant_unavailabilityId_idx" ON "UnavailabilityParticipant"("unavailabilityId");

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnavailabilityParticipant" ADD CONSTRAINT "UnavailabilityParticipant_unavailabilityId_fkey" FOREIGN KEY ("unavailabilityId") REFERENCES "Unavailability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnavailabilityParticipant" ADD CONSTRAINT "UnavailabilityParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
