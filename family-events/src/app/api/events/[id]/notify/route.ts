import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push';
import { APP_NAME_HE } from '@/lib/constants';

type PostPayload = {
  target?: 'statuses' | 'ids' | 'group';
  statuses?: ('NA' | 'APPROVED' | 'DECLINED' | 'MAYBE')[];
  memberIds?: string[];
  groupId?: string;
  message?: string;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const initiator = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!initiator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      host: true,
      coHosts: { include: { user: true } },
      rsvps: { include: { user: true } },
    },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isHostOrCoHost = event.hostId === initiator.id || event.coHosts.some((ch) => ch.userId === initiator.id);
  const isAdmin = initiator.role === 'admin';
  if (!(isHostOrCoHost || isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as PostPayload;
  const target = body.target || 'statuses';

  let candidateRsvps = event.rsvps;
  if (target === 'statuses') {
    const statuses = body.statuses?.length ? body.statuses : ['NA'];
    candidateRsvps = candidateRsvps.filter((r) => statuses.includes(r.status as any));
  } else if (target === 'ids') {
    const ids = Array.isArray(body.memberIds) && body.memberIds.length ? body.memberIds : [];
    candidateRsvps = candidateRsvps.filter((r) => ids.includes(r.userId));
  } else if (target === 'group') {
    if (!body.groupId) {
      return NextResponse.json({ error: 'Missing groupId for target=group' }, { status: 400 });
    }
    const members = await prisma.groupMembership.findMany({ where: { groupId: body.groupId }, select: { userId: true } });
    const memberIds = members.map((m) => m.userId);
    candidateRsvps = candidateRsvps.filter((r) => memberIds.includes(r.userId));
  }

  const uniqueUserIds = Array.from(new Set(candidateRsvps.map((r) => r.userId).filter(Boolean)));
  if (!uniqueUserIds.length) {
    return NextResponse.json({ ok: true, result: { attempted: 0, delivered: 0 } });
  }

  const initiatorName = initiator.name || event.host?.name || 'המארח';
  const eventName = event.title || 'אירוע';
  const pendingCount = uniqueUserIds.length;
  const bodyMessage = body.message?.trim();
  const defaultMessage = pendingCount === 1
    ? `${initiatorName} מחכה לאישורך באירוע "${eventName}"`;
    : `${initiatorName} מחכה לאישורים של ${pendingCount} משתתפים באירוע "${eventName}"`;

  const result = await sendPushToUsers(uniqueUserIds, {
    title: APP_NAME_HE,
    body: bodyMessage && bodyMessage.length >= 4 ? bodyMessage : `${defaultMessage} עדכנו את הסטטוס שלכם`,
    url: `/events/${event.id}`,
    tag: `event-${event.id}-reminder`,
    data: {
      reason: 'reminder',
      eventId: event.id,
      pendingCount,
      target,
    },
  });

  return NextResponse.json({ ok: true, result });
}

