import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { sendPushToUsersExcept } from '@/lib/push';
import { APP_NAME_HE } from '@/lib/constants';

function formatHebrewList(items: string[]) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  const last = items[items.length - 1];
  const rest = items.slice(0, -1);
  return `${rest.join(', ')} ו${last}`;
}

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
    let pushBody = uniqueChanges.length ? formatHebrewList(uniqueChanges) : 'פרטי האירוע עודכנו';
      if (startChanged && event.startAt) {
        const formattedStart = new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.startAt));
      pushBody += ` · זמן התחלה חדש: ${formattedStart}`;
      }
    const pendingInvitees = invitees.filter((r) => r.status === 'NA');
    if (pendingInvitees.length > 0) {
      const sample = pendingInvitees.slice(0, 2).map((r) => r.user?.name || 'מוזמן');
      const extra = pendingInvitees.length - sample.length;
      const namesPart = sample.join(' ו');
      pushBody += ` · מחכים עדיין לאישור של ${namesPart}${extra > 0 ? ` ועוד ${extra}` : ''}`;
      }
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

