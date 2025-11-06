-- CreateTable
CREATE TABLE "EventGroupNote" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventGroupNote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EventGroupNote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventGroupNote_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EventGroupNote_eventId_groupId_key" ON "EventGroupNote"("eventId", "groupId");

-- CreateIndex
CREATE INDEX "EventGroupNote_groupId_idx" ON "EventGroupNote"("groupId");

-- CreateIndex
CREATE INDEX "EventGroupNote_eventId_idx" ON "EventGroupNote"("eventId");
