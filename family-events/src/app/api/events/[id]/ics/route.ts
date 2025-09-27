import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function icsEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return new NextResponse('Not found', { status: 404 });
  const dtStart = new Date(event.startAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtEnd = event.endAt ? new Date(event.endAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : undefined;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@family-events`,
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    dtEnd ? `DTEND:${dtEnd}` : undefined,
    `SUMMARY:${icsEscape(event.title)}`,
    event.location ? `LOCATION:${icsEscape(event.location)}` : undefined,
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : undefined,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[];
  const body = lines.join('\r\n');
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename=event-${event.id}.ics`,
    },
  });
}

