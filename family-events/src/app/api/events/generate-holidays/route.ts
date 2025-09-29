import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user?.familyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const year = Number(body?.year) || new Date().getFullYear();
  const tz = String(body?.tz || 'Asia/Jerusalem');

  // Fetch Israeli holidays from Hebcal
  const items = await fetchIsraelHolidays(year, tz);
  // We include Purim and Shushan Purim; items already contain both in Israel mode
  // Map items to events and skip holidays in the past
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const data = items
    .map((it) => {
      const startAt = toLocalDate(it.date, '19:00');
      const holidayKey = normalizeKey(it.title);
      return {
        title: it.title,
        description: null as string | null,
        location: null as string | null,
        startAt,
        endAt: null as Date | null,
        externalLink: null as string | null,
        isHolidayGenerated: true,
        holidayKey,
        hostId: user.id,
        familyId: user.familyId!,
      };
    })
    .filter((e) => e.startAt >= startOfToday);

  // Prevent duplicates by title/date or holidayKey/date within this family (includes manual entries)
  const existing = await prisma.event.findMany({
    where: {
      familyId: user.familyId,
      startAt: { gte: new Date(`${year}-01-01T00:00:00Z`), lte: new Date(`${year}-12-31T23:59:59Z`) },
    },
    select: { startAt: true, title: true, holidayKey: true },
  });
  const indexByDate = new Map<string, { titles: Set<string>; keys: Set<string> }>();
  for (const e of existing) {
    const dateKey = e.startAt.toISOString().slice(0, 10);
    const entry = indexByDate.get(dateKey) || { titles: new Set<string>(), keys: new Set<string>() };
    entry.titles.add(normalizeKey(e.title || ''));
    if (e.holidayKey) entry.keys.add(String(e.holidayKey));
    indexByDate.set(dateKey, entry);
  }
  const toCreate = data.filter((e) => {
    const dateKey = e.startAt.toISOString().slice(0, 10);
    const entry = indexByDate.get(dateKey);
    if (!entry) return true;
    const titleKey = normalizeKey(e.title);
    if (entry.titles.has(titleKey)) return false;
    if (e.holidayKey && entry.keys.has(e.holidayKey)) return false;
    return true;
  });

  if (toCreate.length) await prisma.event.createMany({ data: toCreate });

  return NextResponse.json({ ok: true, created: toCreate.length, year });
}

async function fetchIsraelHolidays(year: number, tz: string) {
  try {
    const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&year=${year}&month=x&i=on&geo=geoname&lg=h&d=on&b=18&mf=on&ss=on&tz=${encodeURIComponent(tz)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [] as { date: string; title: string }[];
    const j = await res.json();
    const items = (j?.items || []) as any[];
    // Keep only holiday days (exclude candle/havdalah/parsha, etc.)
    const hol = items.filter((x) => x?.category === 'holiday').map((x) => ({ date: x.date as string, title: x.title as string }));
    return hol;
  } catch {
    return [] as { date: string; title: string }[];
  }
}

function toLocalDate(isoDate: string, hhmm: string) {
  // isoDate is YYYY-MM-DD (UTC date from Hebcal); build local date with given time
  const [y, m, d] = isoDate.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 19, mm || 0, 0, 0);
}

function normalizeKey(s: string) {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

