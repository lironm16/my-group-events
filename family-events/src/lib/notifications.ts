import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type NotificationCursorPayload = { id: string; createdAt: string };

export function encodeNotificationCursor(notification: { id: string; createdAt: Date | string }) {
  const createdAtISO = notification.createdAt instanceof Date
    ? notification.createdAt.toISOString()
    : new Date(notification.createdAt).toISOString();
  return Buffer.from(JSON.stringify({ id: notification.id, createdAt: createdAtISO })).toString('base64url');
}

export function decodeNotificationCursor(cursor: string): NotificationCursorPayload | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    const id = typeof parsed.id === 'string' ? parsed.id : '';
    const createdAt = typeof parsed.createdAt === 'string' ? parsed.createdAt : '';
    if (!id || !createdAt) return null;
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return null;
    return { id, createdAt: date.toISOString() };
  } catch {
    return null;
  }
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  const where: Prisma.NotificationWhereInput = { userId, readAt: null };
  if (Array.isArray(ids) && ids.length) {
    where.id = { in: ids };
  }
  const now = new Date();
  const { count } = await prisma.notification.updateMany({ where, data: { readAt: now } });
  return count;
}

export async function createNotifications(payloads: Array<{
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Prisma.JsonValue;
}>): Promise<void> {
  if (!payloads.length) return;
  const data = payloads.map((item) => ({
    userId: item.userId,
    type: item.type,
    title: item.title,
    body: item.body ?? null,
    href: item.href ?? null,
    metadata: item.metadata ?? null,
  }));
  await prisma.notification.createMany({ data, skipDuplicates: true });
}

