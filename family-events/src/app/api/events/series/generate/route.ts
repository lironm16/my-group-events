import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchIsraelHolidays } from '@/lib/holidays';
import { computeNextOccurrence, computeReadyAt, parseTemplateData, toJsonValue, type RecurrenceConfig } from '@/lib/recurrence';

const DEFAULT_BATCH_SIZE = 10;

export async function POST(req: Request) {
  const secret = process.env.EVENT_SERIES_CRON_SECRET || process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get('x-cron-secret') || req.headers.get('authorization') || '';
    if (!provided || !timingSafeEqual(provided.trim(), secret.trim())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  const take = Number.isFinite(Number(process.env.EVENT_SERIES_BATCH_SIZE))
    ? Math.max(1, Number(process.env.EVENT_SERIES_BATCH_SIZE))
    : DEFAULT_BATCH_SIZE;

  const dueSeries = await prisma.eventSeries.findMany({
    where: {
      nextReadyAt: { lte: now },
      NOT: [{ nextReadyAt: null }, { nextOccurrenceStart: null }],
    },
    orderBy: { nextReadyAt: 'asc' },
    take,
  });

  if (!dueSeries.length) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const holidayCache = new Map<number, Awaited<ReturnType<typeof fetchIsraelHolidays>>>();

  const results: Array<{ seriesId: string; created?: string; skipped?: string; error?: string }> = [];

  for (const series of dueSeries) {
    const holidays: Awaited<ReturnType<typeof fetchIsraelHolidays>> = [];
    if (series.skipHolidays) {
      const startDate = new Date(series.nextOccurrenceStart!);
      const startYear = startDate.getFullYear();
      for (const year of [startYear, startYear + 1]) {
        if (!holidayCache.has(year)) {
          holidayCache.set(year, await fetchIsraelHolidays(year));
        }
        holidays.push(...(holidayCache.get(year) || []));
      }
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const currentSeries = await tx.eventSeries.findUnique({ where: { id: series.id } });
      if (!currentSeries) return { skipped: 'series_missed' } as const;
      if (!currentSeries.nextOccurrenceStart || !currentSeries.nextReadyAt) return { skipped: 'series_idle' } as const;
      if (currentSeries.nextReadyAt > now) return { skipped: 'not_due' } as const;

      const template = parseTemplateData(currentSeries.templateData);
      if (!template) {
        await tx.eventSeries.update({
          where: { id: currentSeries.id },
          data: { nextReadyAt: null, nextOccurrenceStart: null, nextOccurrenceEnd: null },
        });
        return { error: 'invalid_template' } as const;
      }

      const start = new Date(currentSeries.nextOccurrenceStart);
      const durationMs = currentSeries.baseDurationMs != null ? Number(currentSeries.baseDurationMs) : null;
      const end = currentSeries.nextOccurrenceEnd
        ? new Date(currentSeries.nextOccurrenceEnd)
        : durationMs != null ? new Date(start.getTime() + durationMs) : null;

      const existing = await tx.event.findFirst({
        where: { seriesId: currentSeries.id, startAt: start },
        select: { id: true, endAt: true },
      });
      if (existing) {
        const nextDuplicate = computeNextOccurrence(start, recurrenceConfig, durationMs ?? undefined, holidays);
        const readyAt = nextDuplicate ? computeReadyAt(start, end ?? null, durationMs ?? undefined) : null;
        await tx.eventSeries.update({
          where: { id: currentSeries.id },
          data: {
            nextOccurrenceStart: nextDuplicate?.start ?? null,
            nextOccurrenceEnd: nextDuplicate?.end ?? null,
            nextReadyAt: readyAt,
          },
        });
        return { skipped: 'duplicate' } as const;
      }

      const recurrenceConfig: RecurrenceConfig = {
        frequency: currentSeries.frequency === 'WEEKLY' ? 'WEEKLY' : 'WEEKLY',
        interval: currentSeries.interval || 1,
        skipHolidays: currentSeries.skipHolidays,
        until: currentSeries.until ?? null,
        noEndDate: currentSeries.noEndDate,
      };

      if (!currentSeries.noEndDate && currentSeries.until && start > currentSeries.until) {
        await tx.eventSeries.update({
          where: { id: currentSeries.id },
          data: { nextReadyAt: null, nextOccurrenceStart: null, nextOccurrenceEnd: null },
        });
        return { skipped: 'beyond_until' } as const;
      }

      const lastEvent = await tx.event.findFirst({
        where: { seriesId: currentSeries.id },
        orderBy: [{ seriesOccurrence: 'desc' }, { startAt: 'desc' }],
      });

      const seriesOccurrence = (lastEvent?.seriesOccurrence || 0) + 1;
      const recurrenceJson = toJsonValue({
        freq: recurrenceConfig.frequency,
        interval: recurrenceConfig.interval,
        skipHolidays: recurrenceConfig.skipHolidays,
        until: recurrenceConfig.until ? recurrenceConfig.until.toISOString() : null,
        noEndDate: !!recurrenceConfig.noEndDate,
      });

      const event = await tx.event.create({
        data: {
          title: template.title,
          description: template.description,
          location: template.location,
          image: template.image,
          startAt: start,
          endAt: end ?? null,
          externalLink: template.externalLink,
          isHolidayGenerated: !!template.holidayKey,
          holidayKey: template.holidayKey,
          visibleToAll: template.visibleToAll,
          rsvpOpenToAll: template.rsvpOpenToAll,
          hostId: template.hostId,
          familyId: template.familyId,
          recurrence: recurrenceJson,
          seriesId: currentSeries.id,
          seriesOccurrence,
          generatedFromEventId: lastEvent?.id ?? null,
        },
      });

      if (template.coHostIds.length) {
        await tx.eventHost.createMany({
          data: template.coHostIds.map((uid) => ({ eventId: event.id, userId: uid })),
          skipDuplicates: true,
        });
      }
      if (template.guestUserIds.length) {
        await tx.rSVP.createMany({
          data: template.guestUserIds.map((uid) => ({ eventId: event.id, userId: uid, status: 'NA' })),
          skipDuplicates: true,
        });
      }

      const next = computeNextOccurrence(start, recurrenceConfig, durationMs ?? undefined, holidays);
      const nextReadyAt = next ? computeReadyAt(start, end ?? null, durationMs ?? undefined) : null;

      await tx.eventSeries.update({
        where: { id: currentSeries.id },
        data: {
          nextOccurrenceStart: next?.start ?? null,
          nextOccurrenceEnd: next?.end ?? null,
          nextReadyAt: nextReadyAt,
        },
      });

      return { created: event.id } as const;
    });

    results.push({ seriesId: series.id, ...outcome });
  }

  return NextResponse.json({ processed: results.length, results });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

