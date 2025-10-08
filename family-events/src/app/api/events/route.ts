import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

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
  const created = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      externalLink: body.externalLink ?? null,
      isHolidayGenerated: body.holidayKey ? true : false,
      holidayKey: body.holidayKey ?? null,
      hostId: user.id,
      familyId: user.familyId ?? null,
    },
  });
  // Create RSVPs for selected guests
  try {
    const guestIds: string[] = JSON.parse(String(body?.guestSelection || '[]'));
    if (Array.isArray(guestIds) && guestIds.length) {
      const unique = Array.from(new Set(guestIds));
      await prisma.rSVP.createMany({ data: unique.map((uid) => ({ eventId: created.id, userId: uid, status: 'MAYBE' })) });
    }
  } catch {}
  // Optionally notify creator even if not owner
  if (body?.notifyCreator && user?.id) {
    try {
      await prisma.rSVP.upsert({
        where: { eventId_userId: { eventId: created.id, userId: user.id } },
        update: {},
        create: { eventId: created.id, userId: user.id, status: 'MAYBE' },
      });
    } catch {}
  }
  // Handle recurrence (daily/weekly/monthly)
  let frequency: 'daily' | 'weekly' | 'monthly' | null = null;
  let until: Date | null = null;
  let skipHolidays = false;
  if (body?.repeat?.weeklyUntil) {
    frequency = 'weekly';
    until = new Date(body.repeat.weeklyUntil);
    skipHolidays = !!body.repeat.skipHolidays;
  } else if (body?.repeat?.frequency && body?.repeat?.until) {
    frequency = body.repeat.frequency;
    until = new Date(body.repeat.until);
    skipHolidays = frequency === 'weekly' ? !!body.repeat.skipHolidays : false;
  }
  if (frequency && until) {
    let holidays: { date: string; title: string }[] = [];
    if (frequency === 'weekly' && skipHolidays) {
      const years = new Set<number>([created.startAt.getFullYear(), until.getFullYear()]);
      for (const y of years) {
        const hs = await fetchIsraelHolidays(y);
        holidays = holidays.concat(hs);
      }
    }
    const series: { startAt: Date; endAt: Date | null }[] = [];
    let cursor = new Date(created.startAt);
    const originalDay = created.startAt.getDate();
    while (true) {
      let next = new Date(cursor);
      if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
      } else if (frequency === 'weekly') {
        next.setDate(next.getDate() + 7);
      } else if (frequency === 'monthly') {
        next.setDate(1);
        next.setMonth(next.getMonth() + 1);
        const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(originalDay, daysInMonth));
      }
      cursor = next;
      if (cursor > until) break;
      if (frequency === 'weekly' && skipHolidays && isHoliday(cursor, holidays)) continue;
      const dur = created.endAt ? created.endAt.getTime() - created.startAt.getTime() : 0;
      const endAt = created.endAt ? new Date(cursor.getTime() + dur) : null;
      series.push({ startAt: new Date(cursor), endAt });
    }
    if (series.length) {
      await prisma.event.createMany({
        data: series.map(s => ({
          title: body.title,
          description: body.description ?? null,
          location: body.location ?? null,
          startAt: s.startAt,
          endAt: s.endAt,
          externalLink: body.externalLink ?? null,
          isHolidayGenerated: false,
          holidayKey: null,
          hostId: user.id,
          familyId: user.familyId ?? null,
        })),
      });
    }
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

