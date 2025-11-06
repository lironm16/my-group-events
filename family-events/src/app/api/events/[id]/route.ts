import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { sendPushToUsersExcept } from '@/lib/push';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { rsvps: { include: { user: true } }, host: true, coHosts: { include: { user: true } } },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ event });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.hostId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      externalLink: body.externalLink ?? null,
      isHolidayGenerated: body.holidayKey !== undefined ? !!body.holidayKey : undefined,
      holidayKey: body.holidayKey ?? undefined,
    },
  });

  try {
      const invitees = await prisma.rSVP.findMany({ where: { eventId: params.id }, select: { userId: true, status: true, user: { select: { name: true, gender: true } } } });
    const coHosts = await prisma.eventHost.findMany({ where: { eventId: params.id }, select: { userId: true } });
    const recipients = [...invitees.map(i => i.userId), ...coHosts.map(ch => ch.userId), event.hostId];
    const changes: string[] = [];
    if (body.title !== undefined && body.title !== existing.title) changes.push('שם');
    if (body.location !== undefined && (body.location ?? '') !== (existing.location ?? '')) changes.push('מיקום');
    const startChanged = body.startAt !== undefined && Boolean(existing.startAt) && new Date(body.startAt).getTime() !== existing.startAt.getTime();
    if (startChanged) changes.push('זמן התחלה');
    const endChanged = body.endAt !== undefined && ((existing.endAt ? existing.endAt.getTime() : null) !== (body.endAt ? new Date(body.endAt).getTime() : null));
    if (endChanged) changes.push('זמן סיום');
    if (body.description !== undefined && (body.description ?? '') !== (existing.description ?? '')) changes.push('תיאור');
    if (body.externalLink !== undefined && (body.externalLink ?? '') !== (existing.externalLink ?? '')) changes.push('קישור');

    const uniqueChanges = Array.from(new Set(changes));
    const eventName = event.title || 'אירוע';
    let changeSummary = '';
    if (uniqueChanges.length === 1) {
      const field = uniqueChanges[0];
      const valueMapper: Record<string, () => string> = {
        'שם': () => `שם עודכן ל"${body.title}"`,
        'מיקום': () => body.location ? `מיקום עודכן ל"${body.location}"` : 'המיקום עודכן',
        'תיאור': () => 'התיאור עודכן',
        'קישור': () => 'קישור עודכן',
        'זמן התחלה': () => body.startAt ? `זמן התחלה עודכן ל${new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(body.startAt))}` : 'זמן התחלה עודכן',
        'זמן סיום': () => body.endAt ? `זמן סיום עודכן ל${new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(body.endAt))}` : 'זמן סיום עודכן',
      };
      changeSummary = valueMapper[field]?.() || `שדה ${field} עודכן`;
    } else if (uniqueChanges.length > 1) {
      changeSummary = 'The date and desc were updated';
    } else {
      changeSummary = `${eventName}: פרטי האירוע עודכנו`;
    }

    const parts: string[] = [changeSummary];
    if (startChanged && event.startAt && !uniqueChanges.includes('זמן התחלה')) {
      const formattedStart = new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.startAt));
      parts.push(`זמן התחלה חדש: ${formattedStart}`);
    }

    const pendingInvitees = invitees.filter((r) => r.status === 'NA');
    if (pendingInvitees.length > 0) {
      const sample = pendingInvitees.slice(0, 2).map((r) => r.user?.name || 'מוזמן');
      const extra = pendingInvitees.length - sample.length;
      const namesPart = sample.join(' ו');
      parts.push(`מחכים עדיין לאישור של ${namesPart}${extra > 0 ? ` ועוד ${extra}` : ''}`);
    }

    const pushBody = parts.join(' · ');
    await sendPushToUsersExcept(recipients, [user.id], {
      title: eventName,
      body: pushBody,
      url: `/events/${event.id}`,
      tag: `event-${event.id}`,
    });
  } catch (err) {
    console.error('[push] Failed to enqueue event update notification', err);
  }
  return NextResponse.json({ event });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing) return new NextResponse(null, { status: 204 });
  if (existing.hostId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // If occurrenceStartAt is provided, record an exception instead of deleting the master
  const { searchParams } = new URL(req.url);
  const occ = searchParams.get('occurrenceStartAt');
  if (occ) {
    const iso = new Date(occ).toISOString();
    const curr = (existing as any).recurrenceExceptions as string[] | null;
    const next = Array.from(new Set([...(Array.isArray(curr) ? curr : []), iso]));
    await prisma.event.update({ where: { id: params.id }, data: { recurrenceExceptions: next as any } });
    return new NextResponse(null, { status: 204 });
  }
  // Otherwise delete the entire event (cascade manually to avoid FK constraint errors)
  await prisma.$transaction([
    prisma.rSVP.deleteMany({ where: { eventId: params.id } }),
    prisma.eventHost.deleteMany({ where: { eventId: params.id } }),
    prisma.event.delete({ where: { id: params.id } }),
  ]);
  return new NextResponse(null, { status: 204 });
}

