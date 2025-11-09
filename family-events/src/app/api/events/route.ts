import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { sendPushToUsersExcept } from '@/lib/push';
import { UnavailabilityStatus } from '@prisma/client';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '12')));
  const where = { OR: [{ hostId: user.id }, { familyId: user.familyId ?? undefined }] };
  const total = await prisma.event.count({ where });
  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: { rsvps: true, host: true },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return NextResponse.json({ events, page, pageSize, total });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const hostId: string = typeof body?.hostId === 'string' && body.hostId.trim() ? body.hostId : user.id;
  const coHostIds: string[] = Array.isArray(body?.coHostIds)
    ? Array.from(new Set(body.coHostIds.filter((x: any) => typeof x === 'string' && x && x !== hostId)))
    : [];
  let invitedGuestIds: string[] = [];
  try {
    const guestIds: unknown = body?.guestSelection
      ? JSON.parse(String(body.guestSelection))
      : Array.isArray(body?.guestIds)
        ? body.guestIds
        : [];
    if (Array.isArray(guestIds)) {
      invitedGuestIds = Array.from(
        new Set(
          guestIds.filter(
            (raw: unknown): raw is string =>
              typeof raw === 'string' && raw.length > 0 && raw !== hostId
          )
        )
      );
    }
  } catch (err) {
    console.warn('[events] Failed to parse guest selection payload', err);
  }

  const eventStart = new Date(body.startAt);
  if (Number.isNaN(eventStart.getTime())) {
    return NextResponse.json({ error: 'Invalid startAt' }, { status: 400 });
  }
  let storedEnd: Date | null = null;
  if (body.endAt) {
    const parsedEnd = new Date(body.endAt);
    if (Number.isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ error: 'Invalid endAt' }, { status: 400 });
    }
    storedEnd = parsedEnd;
  }
  if (storedEnd && storedEnd.getTime() <= eventStart.getTime()) {
    storedEnd = new Date(eventStart.getTime() + 60_000);
  }
  const conflictEnd = storedEnd ?? new Date(eventStart.getTime() + 60_000);

  // Build recurrence configuration if provided
  let recurrence: any = undefined;
  if (body?.repeat?.weeklyUntil) {
    recurrence = {
      freq: 'WEEKLY',
      until: new Date(body.repeat.weeklyUntil).toISOString(),
      skipHolidays: !!body.repeat.skipHolidays,
    };
  }
  const participantSet = new Set<string>([hostId, ...coHostIds, ...invitedGuestIds].filter(Boolean));

  if (participantSet.size > 0) {
    const conflicts = await prisma.unavailabilityParticipant.findMany({
      where: {
        userId: { in: Array.from(participantSet) },
        unavailability: {
          status: UnavailabilityStatus.ACTIVE,
          familyId: user.familyId ?? undefined,
          startAt: { lt: conflictEnd },
          OR: [
            { endAt: null },
            { endAt: { gt: eventStart } },
          ],
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        unavailability: { select: { id: true, title: true, reason: true, scope: true, startAt: true, endAt: true } },
      },
    });
    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map((record) => ({
        userId: record.userId,
        userName: record.user?.name ?? null,
        unavailabilityId: record.unavailabilityId,
        reason: record.unavailability.reason ?? record.unavailability.title ?? null,
        scope: record.unavailability.scope,
        startAt: record.unavailability.startAt.toISOString(),
        endAt: record.unavailability.endAt ? record.unavailability.endAt.toISOString() : null,
        type: record.userId === hostId ? 'HOST' : coHostIds.includes(record.userId) ? 'CO_HOST' : 'GUEST',
      }));
      return NextResponse.json(
        {
          error: 'לא ניתן ליצור אירוע, חלק מהמשתתפים חסומים במועד הזה',
          conflicts: conflictDetails,
        },
        { status: 409 }
      );
    }
  }

  const created = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      image: body.image ?? null,
      startAt: eventStart,
      endAt: storedEnd,
      externalLink: body.externalLink ?? null,
      isHolidayGenerated: body.holidayKey ? true : false,
      holidayKey: body.holidayKey ?? null,
      hostId,
      familyId: user.familyId ?? null,
      recurrence,
      recurrenceExceptions: undefined,
    },
  });
  // Add co-hosts if provided
  if (coHostIds.length) {
    await prisma.eventHost.createMany({
      data: coHostIds.map((uid) => ({ eventId: created.id, userId: uid })),
      skipDuplicates: true,
    });
  }

  // Create RSVPs for selected guests
  if (invitedGuestIds.length) {
    await prisma.rSVP.createMany({
      data: invitedGuestIds.map((uid) => ({ eventId: created.id, userId: uid, status: 'NA' })),
      skipDuplicates: true,
    });
  }

  try {
    const recipients = Array.from(new Set([created.hostId, ...coHostIds, ...invitedGuestIds]));
    const eventName = created.title;
    const formattedStart = created.startAt
      ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(created.startAt))
      : null;
    const bodyText = formattedStart
      ? `נוסף אירוע חדש בשם "${eventName}" והוא יתקיים ב-${formattedStart}`
      : `נוסף אירוע חדש בשם "${eventName}"`;
    await sendPushToUsersExcept(recipients, [user.id], {
      title: eventName,
      body: bodyText,
      url: `/events/${created.id}`,
      tag: `event-${created.id}`,
    });
  } catch (err) {
    console.error('[push] Failed to enqueue new event notification', err);
  }
  return NextResponse.json({ event: created }, { status: 201 });
}

async function fetchIsraelHolidays(year: number) {
  try {
    const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&year=${year}&month=x&i=on&geo=geoname&lg=h&d=on&b=18&mf=on&ss=on&tz=Asia/Jerusalem`; 
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [] as { date: string; title: string }[];
    const j = await res.json();
    const items = (j?.items || []) as any[];
    return items.filter(x => x?.category === 'holiday').map(x => ({ date: x.date, title: x.title }));
  } catch {
    return [] as { date: string; title: string }[];
  }
}

function isHoliday(d: Date, holidays: { date: string; title: string }[]) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const iso = `${yyyy}-${mm}-${dd}`;
  return holidays.some(h => h.date?.startsWith(iso));
}

