import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { Prisma } from '@prisma/client';
import { fetchIsraelHolidays } from '@/lib/holidays';
import { buildTemplateData, computeNextOccurrence, computeReadyAt, deriveDurationMs, toJsonValue, type RecurrenceConfig } from '@/lib/recurrence';
import { createNotifications } from '@/lib/notifications';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

type EventCursorPayload = { id: string; startAt: string };

function encodeEventCursor(event: { id: string; startAt: Date | string }) {
  const startAtISO = event.startAt instanceof Date ? event.startAt.toISOString() : new Date(event.startAt).toISOString();
  return Buffer.from(JSON.stringify({ id: event.id, startAt: startAtISO })).toString('base64url');
}

function decodeEventCursor(value: string): EventCursorPayload | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    const id = typeof parsed.id === 'string' ? parsed.id : '';
    const startAt = typeof parsed.startAt === 'string' ? parsed.startAt : '';
    if (!id || !startAt) return null;
    const date = new Date(startAt);
    if (Number.isNaN(date.getTime())) return null;
    return { id, startAt: date.toISOString() };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const rawPageSize = Number(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(rawPageSize) ? rawPageSize : DEFAULT_PAGE_SIZE));
  const orderParam = (searchParams.get('order') || 'asc').toLowerCase();
  const order: 'asc' | 'desc' = orderParam === 'desc' ? 'desc' : 'asc';
  const cursorParam = searchParams.get('cursor');

  const visibilityClauses: Prisma.EventWhereInput[] = [{ hostId: user.id }];
  if (user.familyId) visibilityClauses.push({ familyId: user.familyId });
  const where: Prisma.EventWhereInput = { OR: visibilityClauses };
  const orderBy = [{ startAt: order }, { id: order }];
  const include = { rsvps: true, host: true } as const;

  if (cursorParam) {
    const decoded = decodeEventCursor(cursorParam);
    if (!decoded) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
    const cursorDate = new Date(decoded.startAt);
    const comparison = order === 'asc'
      ? {
          OR: [
            { startAt: { gt: cursorDate } },
            {
              AND: [
                { startAt: cursorDate },
                { id: { gt: decoded.id } },
              ],
            },
          ],
        }
      : {
          OR: [
            { startAt: { lt: cursorDate } },
            {
              AND: [
                { startAt: cursorDate },
                { id: { lt: decoded.id } },
              ],
            },
          ],
        };
    const queryWhere = { AND: [where, comparison] };
    const rows = await prisma.event.findMany({
      where: queryWhere,
      orderBy,
      include,
      take: pageSize + 1,
    });
    const hasMore = rows.length > pageSize;
    const events = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasMore && events.length ? encodeEventCursor(events[events.length - 1]) : null;
    return NextResponse.json({ events, pageSize, order, hasMore, nextCursor });
  }

  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const total = await prisma.event.count({ where });
  const events = await prisma.event.findMany({
    where,
    orderBy,
    include,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const nextCursor = events.length ? encodeEventCursor(events[events.length - 1]) : null;
  return NextResponse.json({ events, page, pageSize, total, order, nextCursor });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const startAt = body.startAt ? new Date(body.startAt) : null;
  const endAt = body.endAt ? new Date(body.endAt) : null;
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  if (!startAt || Number.isNaN(startAt.getTime())) return NextResponse.json({ error: 'Invalid startAt' }, { status: 400 });
  if (endAt && Number.isNaN(endAt.getTime())) return NextResponse.json({ error: 'Invalid endAt' }, { status: 400 });
  if (endAt && endAt < startAt) return NextResponse.json({ error: 'End must be after start' }, { status: 400 });

  const hostId = typeof body.hostId === 'string' && body.hostId ? body.hostId : user.id;
  const coHostIds = Array.isArray(body?.coHostIds)
    ? Array.from(new Set(body.coHostIds.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)))
    : [];

  let guestIds: string[] = [];
  try {
    const parsed = JSON.parse(String(body?.guestSelection || '[]'));
    if (Array.isArray(parsed)) guestIds = Array.from(new Set(parsed.filter((value): value is string => typeof value === 'string' && value)));
  } catch {
    guestIds = [];
  }

  const recurrenceInput = body?.repeat || null;
  let recurrenceConfig: RecurrenceConfig | null = null;
  if (recurrenceInput && (recurrenceInput.weeklyUntil || recurrenceInput.noEndDate)) {
    const untilDate = recurrenceInput.noEndDate ? null : recurrenceInput.weeklyUntil ? new Date(recurrenceInput.weeklyUntil) : null;
    if (untilDate && Number.isNaN(untilDate.getTime())) return NextResponse.json({ error: 'Invalid repeat until date' }, { status: 400 });
    recurrenceConfig = {
      frequency: 'WEEKLY',
      interval: 1,
      skipHolidays: !!recurrenceInput.skipHolidays,
      until: untilDate,
      noEndDate: !!recurrenceInput.noEndDate,
    };
  }

  const durationMs = deriveDurationMs(startAt, endAt);
  let holidaysList: Awaited<ReturnType<typeof fetchIsraelHolidays>> = [];
  if (recurrenceConfig?.skipHolidays) {
    const year = startAt.getFullYear();
    const nextYear = year + 1;
    const [curr, next] = await Promise.all([fetchIsraelHolidays(year), fetchIsraelHolidays(nextYear)]);
    holidaysList = [...curr, ...next];
  }
  const nextOccurrence = recurrenceConfig
    ? computeNextOccurrence(startAt, recurrenceConfig, durationMs ?? undefined, holidaysList)
    : null;
  const readyAt = recurrenceConfig && nextOccurrence ? computeReadyAt(startAt, endAt ?? null, durationMs ?? undefined) : null;

  const templateData = recurrenceConfig
    ? buildTemplateData({
        title,
        description: body.description ?? null,
        location: body.location ?? null,
        image: body.image ?? null,
        externalLink: body.externalLink ?? null,
        holidayKey: body.holidayKey ?? null,
        visibleToAll: body.visibleToAll !== undefined ? !!body.visibleToAll : true,
        rsvpOpenToAll: body.rsvpOpenToAll !== undefined ? !!body.rsvpOpenToAll : false,
        hostId,
        coHostIds,
        guestUserIds: guestIds,
        familyId: user.familyId ?? null,
      })
    : null;

  const recurrenceJson = recurrenceConfig
    ? toJsonValue({
        freq: recurrenceConfig.frequency,
        interval: recurrenceConfig.interval,
        skipHolidays: recurrenceConfig.skipHolidays,
        until: recurrenceConfig.until ? recurrenceConfig.until.toISOString() : null,
        noEndDate: !!recurrenceConfig.noEndDate,
      })
    : undefined;

  const seriesPayload = recurrenceConfig && templateData
    ? {
        frequency: recurrenceConfig.frequency,
        interval: recurrenceConfig.interval,
        skipHolidays: recurrenceConfig.skipHolidays,
        until: recurrenceConfig.until ?? null,
        noEndDate: !!recurrenceConfig.noEndDate,
        templateData: toJsonValue(templateData),
        baseDurationMs: durationMs != null ? BigInt(Math.round(durationMs)) : null,
        nextOccurrenceStart: nextOccurrence?.start ?? null,
        nextOccurrenceEnd: nextOccurrence?.end ?? null,
        nextReadyAt: readyAt,
        ownerId: hostId,
        familyId: user.familyId ?? null,
      }
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const seriesRecord = seriesPayload
      ? await tx.eventSeries.create({ data: seriesPayload })
      : null;

    const event = await tx.event.create({
      data: {
        title,
        description: body.description ?? null,
        location: body.location ?? null,
        image: body.image ?? null,
        startAt,
        endAt: endAt ?? null,
        externalLink: body.externalLink ?? null,
        isHolidayGenerated: !!body.holidayKey,
        holidayKey: body.holidayKey ?? null,
        hostId,
        familyId: user.familyId ?? null,
        recurrence: recurrenceJson,
        recurrenceExceptions: undefined,
        seriesId: seriesRecord?.id ?? null,
        seriesOccurrence: seriesRecord ? 1 : null,
      },
    });

    if (coHostIds.length) {
      await tx.eventHost.createMany({
        data: coHostIds.map((uid) => ({ eventId: event.id, userId: uid })),
        skipDuplicates: true,
      });
    }
    if (guestIds.length) {
      await tx.rSVP.createMany({
        data: guestIds.map((uid) => ({ eventId: event.id, userId: uid, status: 'NA' })),
        skipDuplicates: true,
      });
    }

    return { event };
  });

  const notifyTargets = new Set<string>();
  if (hostId !== user.id) notifyTargets.add(hostId);
  coHostIds.forEach((uid) => notifyTargets.add(uid));
  if (notifyTargets.size) {
    const startLabel = startAt.toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' });
    const payloads = Array.from(notifyTargets).map((uid) => ({
      userId: uid,
      type: recurrenceConfig ? 'event.series.created' : 'event.created',
      title: recurrenceConfig
        ? `????? "${title}" ????`
        : `???? ????? "${title}"`,
      body: recurrenceConfig
        ? `????? ?????? ?????? ?-${startLabel}`
        : `?????? ?????? ?-${startLabel}`,
      href: `/events/${result.event.id}`,
      metadata: { eventId: result.event.id },
    }));
    try {
      await createNotifications(payloads);
    } catch (error) {
      console.error('Failed to create notifications', error);
    }
  }

  return NextResponse.json({ event: result.event }, { status: 201 });
}
