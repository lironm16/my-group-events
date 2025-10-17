import { NextResponse } from 'next/server';
import { verifyUserIcsToken } from '@/lib/ics';
import { prisma } from '@/lib/prisma';

function icsEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const user = await verifyUserIcsToken(token);
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  // Fetch events the user hosts or is invited to, plus visible events in their families
  const familyMemberships = await prisma.familyMembership.findMany({ where: { userId: user.id }, select: { familyId: true } });
  const familyIds = new Set<string>(familyMemberships.map((m) => m.familyId));
  if (user.familyId) familyIds.add(user.familyId);
  const familyList = Array.from(familyIds);

  const orClauses: any[] = [];
  orClauses.push({ hostId: user.id });
  orClauses.push({ rsvps: { some: { userId: user.id } } });
  if (familyList.length > 0) {
    orClauses.push({ familyId: { in: familyList }, visibleToAll: true });
  }
  const events = await prisma.event.findMany({
    where: { OR: orClauses },
    orderBy: { startAt: 'asc' },
    include: { host: true },
  });

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Events//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const ev of events) {
    const dtStart = new Date(ev.startAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtEnd = ev.endAt ? new Date(ev.endAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : undefined;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@family-events`);
    lines.push(`DTSTAMP:${dtStart}`);
    lines.push(`DTSTART:${dtStart}`);
    if (dtEnd) lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');

  const body = lines.join('\r\n');
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename=events.ics',
      'Cache-Control': 'private, max-age=1800',
    },
  });
}
