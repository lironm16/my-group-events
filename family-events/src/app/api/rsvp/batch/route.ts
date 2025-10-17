import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true, role: true, groupId: true } });
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const eventId: string | undefined = body?.eventId;
  const updates: { userId: string; status: 'APPROVED' | 'DECLINED' | 'MAYBE' | 'NA'; note?: string | null }[] = Array.isArray(body?.updates) ? body.updates : [];
  const remove: string[] = Array.isArray(body?.remove) ? body.remove : [];
  if (!eventId) return NextResponse.json({ error: 'Missing inputs' }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { hostId: true, familyId: true } });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = me.role === 'admin';
  const isHost = event.hostId === me.id;

  // Build allowed set: self + same subgroup; host/admin => everyone
  let allowedUserIds: Set<string>;
  if (isAdmin || isHost) {
    const members = await prisma.user.findMany({ where: { familyId: event.familyId }, select: { id: true } });
    allowedUserIds = new Set(members.map((m) => m.id));
  } else {
    const sameGroupMembers = await prisma.user.findMany({ where: { OR: [{ id: me.id }, { groupId: me.groupId || undefined }] }, select: { id: true } });
    allowedUserIds = new Set(sameGroupMembers.map((m) => m.id));
  }

  const valid = new Set(['APPROVED', 'DECLINED', 'MAYBE', 'NA']);
  const toApply = updates.filter((u) => allowedUserIds.has(u.userId) && valid.has(u.status)).map((u) => ({ ...u, note: (u.note ?? null) as string | null }));
  const toRemove = remove.filter((uid) => allowedUserIds.has(uid));

  await prisma.$transaction([
    ...toApply.map((u) =>
      prisma.rSVP.upsert({
        where: { eventId_userId: { eventId, userId: u.userId } },
        create: { eventId, userId: u.userId, status: u.status as any, note: u.note },
        update: { status: u.status as any, note: u.note },
      })
    ),
    ...(toRemove.length ? [
      prisma.rSVP.deleteMany({ where: { eventId, userId: { in: toRemove } } })
    ] : []),
  ]);

  return NextResponse.json({ ok: true, updated: toApply.length, removed: toRemove.length, skipped: updates.length - toApply.length });
}
