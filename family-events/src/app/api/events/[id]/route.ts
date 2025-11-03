import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { Prisma } from '@prisma/client';
import { fetchIsraelHolidays } from '@/lib/holidays';
import {
  buildTemplateData,
  computeNextOccurrence,
  computeReadyAt,
  deriveDurationMs,
  parseTemplateData,
  toJsonValue,
  type RecurrenceConfig,
} from '@/lib/recurrence';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { rsvps: { include: { user: true } }, host: true, coHosts: { include: { user: true } }, series: true },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ event });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = await prisma.event.findUnique({ where: { id: params.id }, include: { series: true } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.hostId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : existing.title;
  const startAt = body.startAt ? new Date(body.startAt) : existing.startAt;
  const endAt = body.endAt ? new Date(body.endAt) : (existing.endAt ?? null);
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  if (Number.isNaN(startAt.getTime())) return NextResponse.json({ error: 'Invalid startAt' }, { status: 400 });
  if (endAt && Number.isNaN(endAt.getTime())) return NextResponse.json({ error: 'Invalid endAt' }, { status: 400 });
  if (endAt && endAt < startAt) return NextResponse.json({ error: 'End must be after start' }, { status: 400 });

  const applyMode: 'single' | 'future' = body?.applyMode === 'future' ? 'future' : 'single';

  const updateData: Prisma.EventUpdateInput = {
    title,
    description: body.description ?? null,
    location: body.location ?? null,
    startAt,
    endAt: endAt ?? null,
    externalLink: body.externalLink ?? null,
  };
  if (body.holidayKey !== undefined) {
    updateData.isHolidayGenerated = !!body.holidayKey;
    updateData.holidayKey = body.holidayKey ?? null;
  }

  let seriesUpdatePayload: {
    config: RecurrenceConfig;
    templateData: ReturnType<typeof buildTemplateData>;
    durationMs: number | null;
    recurrenceJson: Prisma.JsonValue;
  } | null = null;

  if (applyMode === 'future' && existing.seriesId && existing.series) {
    const repeatInput = body?.repeat || {};
    const untilDate = repeatInput.noEndDate ? null : repeatInput.weeklyUntil ? new Date(repeatInput.weeklyUntil) : existing.series.until ?? null;
    if (untilDate && Number.isNaN(untilDate.getTime())) {
      return NextResponse.json({ error: 'Invalid repeat until date' }, { status: 400 });
    }
    const config: RecurrenceConfig = {
      frequency: 'WEEKLY',
      interval: 1,
      skipHolidays: repeatInput.skipHolidays !== undefined ? !!repeatInput.skipHolidays : existing.series.skipHolidays,
      until: untilDate,
      noEndDate: repeatInput.noEndDate !== undefined ? !!repeatInput.noEndDate : existing.series.noEndDate,
    };
    const templateFallback = parseTemplateData(existing.series.templateData);
    const templateData = buildTemplateData({
      title,
      description: body.description ?? null,
      location: body.location ?? null,
      image: templateFallback?.image ?? existing.image ?? null,
      externalLink: body.externalLink ?? null,
      holidayKey: body.holidayKey ?? null,
      visibleToAll: templateFallback?.visibleToAll ?? existing.visibleToAll,
      rsvpOpenToAll: templateFallback?.rsvpOpenToAll ?? existing.rsvpOpenToAll,
      hostId: templateFallback?.hostId ?? existing.hostId,
      coHostIds: templateFallback?.coHostIds ?? [],
      guestUserIds: templateFallback?.guestUserIds ?? [],
      familyId: templateFallback?.familyId ?? existing.familyId ?? null,
    });
    const durationMs = deriveDurationMs(startAt, endAt ?? null);
    const recurrenceJson = toJsonValue({
      freq: config.frequency,
      interval: config.interval,
      skipHolidays: config.skipHolidays,
      until: config.until ? config.until.toISOString() : null,
      noEndDate: !!config.noEndDate,
    });
    seriesUpdatePayload = { config, templateData, durationMs, recurrenceJson };
  }

  if (seriesUpdatePayload) updateData.recurrence = seriesUpdatePayload.recurrenceJson ?? undefined;

  const updated = await prisma.$transaction(async (tx) => {
    if (seriesUpdatePayload && existing.seriesId) {
      const { config, templateData, durationMs } = seriesUpdatePayload;
      await tx.eventSeries.update({
        where: { id: existing.seriesId },
        data: {
          skipHolidays: config.skipHolidays,
          interval: config.interval,
          until: config.until ?? null,
          noEndDate: !!config.noEndDate,
          templateData: toJsonValue(templateData) ?? Prisma.DbNull,
          baseDurationMs: durationMs != null ? BigInt(Math.round(durationMs)) : null,
        },
      });

      await tx.event.updateMany({
        where: { seriesId: existing.seriesId, startAt: { gte: startAt } },
        data: {
          title,
          description: body.description ?? null,
          location: body.location ?? null,
          externalLink: body.externalLink ?? null,
        },
      });
    }

    const updatedEvent = await tx.event.update({ where: { id: existing.id }, data: updateData });

    if (seriesUpdatePayload && existing.seriesId) {
      await recalcSeriesSchedule(tx, existing.seriesId);
    }

    return updatedEvent;
  });

  return NextResponse.json({ event: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = await prisma.event.findUnique({ where: { id: params.id }, include: { series: true } });
  if (!existing) return new NextResponse(null, { status: 204 });
  if (existing.hostId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get('scope') || 'single').toLowerCase();

  await prisma.$transaction(async (tx) => {
    if (scope === 'series' && existing.seriesId) {
      await tx.rSVP.deleteMany({ where: { event: { seriesId: existing.seriesId } } });
      await tx.eventHost.deleteMany({ where: { event: { seriesId: existing.seriesId } } });
      await tx.event.deleteMany({ where: { seriesId: existing.seriesId } });
      await tx.eventSeries.delete({ where: { id: existing.seriesId } });
      return;
    }

    if (scope === 'future' && existing.seriesId) {
      await tx.rSVP.deleteMany({ where: { event: { seriesId: existing.seriesId, startAt: { gte: existing.startAt } } } });
      await tx.eventHost.deleteMany({ where: { event: { seriesId: existing.seriesId, startAt: { gte: existing.startAt } } } });
      await tx.event.deleteMany({ where: { seriesId: existing.seriesId, startAt: { gte: existing.startAt } } });
      await tx.eventSeries.update({
        where: { id: existing.seriesId },
        data: { nextOccurrenceStart: null, nextOccurrenceEnd: null, nextReadyAt: null },
      });
      return;
    }

    await tx.rSVP.deleteMany({ where: { eventId: existing.id } });
    await tx.eventHost.deleteMany({ where: { eventId: existing.id } });
    await tx.event.delete({ where: { id: existing.id } });

    if (existing.seriesId) {
      await recalcSeriesSchedule(tx, existing.seriesId);
    }
  });

  return new NextResponse(null, { status: 204 });
}

async function recalcSeriesSchedule(tx: Prisma.TransactionClient, seriesId: string) {
  const series = await tx.eventSeries.findUnique({ where: { id: seriesId } });
  if (!series) return;
  const lastEvent = await tx.event.findFirst({ where: { seriesId }, orderBy: { startAt: 'desc' } });
  if (!lastEvent) {
    await tx.eventSeries.update({
      where: { id: seriesId },
      data: { nextOccurrenceStart: null, nextOccurrenceEnd: null, nextReadyAt: null },
    });
    return;
  }

  const durationMs = series.baseDurationMs != null ? Number(series.baseDurationMs) : deriveDurationMs(lastEvent.startAt, lastEvent.endAt ?? null);
  const config: RecurrenceConfig = {
    frequency: series.frequency === 'WEEKLY' ? 'WEEKLY' : 'WEEKLY',
    interval: series.interval || 1,
    skipHolidays: series.skipHolidays,
    until: series.until ?? null,
    noEndDate: series.noEndDate,
  };

  let holidays: Awaited<ReturnType<typeof fetchIsraelHolidays>> = [];
  if (config.skipHolidays) {
    const year = lastEvent.startAt.getFullYear();
    const [curr, next] = await Promise.all([fetchIsraelHolidays(year), fetchIsraelHolidays(year + 1)]);
    holidays = [...curr, ...next];
  }

  const nextOccurrence = computeNextOccurrence(lastEvent.startAt, config, durationMs ?? undefined, holidays);
  const readyAt = nextOccurrence ? computeReadyAt(lastEvent.startAt, lastEvent.endAt ?? null, durationMs ?? undefined) : null;

  await tx.eventSeries.update({
    where: { id: seriesId },
    data: {
      nextOccurrenceStart: nextOccurrence?.start ?? null,
      nextOccurrenceEnd: nextOccurrence?.end ?? null,
      nextReadyAt: readyAt,
    },
  });
}


