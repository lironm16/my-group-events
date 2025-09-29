import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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
      await prisma.rSVP.createMany({ data: unique.map((uid) => ({ eventId: created.id, userId: uid, status: Prisma.RSVPStatus.MAYBE })) });
    }
  } catch {}
  // Handle weekly recurrence
  if (body?.repeat?.weeklyUntil) {
    const until = new Date(body.repeat.weeklyUntil);
    const skipHolidays = !!body.repeat.skipHolidays;
    const holidays = skipHolidays ? await fetchIsraelHolidays(created.startAt.getFullYear()) : [];
    const series: { startAt: Date; endAt: Date | null }[] = [];
    let cursor = new Date(created.startAt);
    while (true) {
      cursor = new Date(cursor.getTime());
      cursor.setDate(cursor.getDate() + 7);
      if (cursor > until) break;
      if (skipHolidays && isHoliday(cursor, holidays)) continue;
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

