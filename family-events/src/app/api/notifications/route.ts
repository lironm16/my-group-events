import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { decodeNotificationCursor, encodeNotificationCursor } from '@/lib/notifications';

const PAGE_SIZE_DEFAULT = 15;
const PAGE_SIZE_MAX = 50;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawTake = Number(searchParams.get('limit') || PAGE_SIZE_DEFAULT);
  const take = Math.min(PAGE_SIZE_MAX, Math.max(1, Number.isFinite(rawTake) ? rawTake : PAGE_SIZE_DEFAULT));
  const cursorParam = searchParams.get('cursor') || '';

  const baseWhere = { userId: user.id } as const;
  const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

  let where = baseWhere;
  if (cursorParam) {
    const cursor = decodeNotificationCursor(cursorParam);
    if (!cursor) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
    const cursorDate = new Date(cursor.createdAt);
    where = {
      AND: [
        baseWhere,
        {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              AND: [
                { createdAt: cursorDate },
                { id: { lt: cursor.id } },
              ],
            },
          ],
        },
      ],
    } as any;
  }

  const rows = await prisma.notification.findMany({
    where,
    orderBy,
    take: take + 1,
  });

  const hasMore = rows.length > take;
  const notifications = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore && notifications.length
    ? encodeNotificationCursor(notifications[notifications.length - 1])
    : null;

  const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null } });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      metadata: n.metadata,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    nextCursor,
    unreadCount,
  });
}
