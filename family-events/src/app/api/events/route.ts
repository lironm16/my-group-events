import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

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

  const visibilityClauses = [{ hostId: user.id }];
  if (user.familyId) visibilityClauses.push({ familyId: user.familyId });
  const where = { OR: visibilityClauses };
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
  // Build recurrence configuration if provided
  let recurrence: any = undefined;
  if (body?.repeat?.weeklyUntil) {
    recurrence = {
      freq: 'WEEKLY',
      until: new Date(body.repeat.weeklyUntil).toISOString(),
      skipHolidays: !!body.repeat.skipHolidays,
    };
  }
  const created = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      image: body.image ?? null,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      externalLink: body.externalLink ?? null,
      isHolidayGenerated: body.holidayKey ? true : false,
      holidayKey: body.holidayKey ?? null,
      hostId: (body.hostId && typeof body.hostId === 'string') ? body.hostId : user.id,
      familyId: user.familyId ?? null,
      recurrence,
      recurrenceExceptions: undefined,
    },
  });
  // Add co-hosts if provided
  if (Array.isArray(body?.coHostIds) && body.coHostIds.length) {
    const uniqueIds: string[] = Array.from(new Set(body.coHostIds.filter((x: any) => typeof x === 'string')));
    if (uniqueIds.length) {
      await prisma.eventHost.createMany({
        data: uniqueIds.map((uid) => ({ eventId: created.id, userId: uid })),
        skipDuplicates: true,
      });
    }
  }
  // Create RSVPs for selected guests
  try {
    const guestIds: string[] = JSON.parse(String(body?.guestSelection || '[]'));
    if (Array.isArray(guestIds) && guestIds.length) {
      const unique = Array.from(new Set(guestIds));
      await prisma.rSVP.createMany({ data: unique.map((uid) => ({ eventId: created.id, userId: uid, status: 'NA' })) });
    }
  } catch {}
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

