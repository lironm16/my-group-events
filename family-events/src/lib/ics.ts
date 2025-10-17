import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const SECRET = (process.env.NEXTAUTH_SECRET || process.env.ICS_SECRET || 'change-me').trim();

export function buildUserIcsToken(userId: string, createdAtIso?: string) {
  const payload = `${userId}.${createdAtIso || ''}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function buildUserIcsTokenFromDb(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, createdAt: true } as any });
  if (!user) return '';
  const createdIso = (user as any).createdAt instanceof Date ? (user as any).createdAt.toISOString() : '';
  return buildUserIcsToken(userId, createdIso);
}

export async function verifyUserIcsToken(token: string) {
  const parts = String(token || '').split('.');
  if (parts.length < 3) return null;
  const userId = parts[0];
  const createdAtIso = parts[1];
  const sig = parts.slice(2).join('.');
  const expected = crypto.createHmac('sha256', SECRET).update(`${userId}.${createdAtIso}`).digest('base64url');
  if (sig !== expected) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  // Optional: rotate on account creation mismatch
  try {
    const actualIso = ((user as any).createdAt as Date)?.toISOString?.() || '';
    const expectedSig = crypto.createHmac('sha256', SECRET).update(`${user.id}.${actualIso}`).digest('base64url');
    if (expectedSig !== sig) return null;
  } catch {}
  return user;
}
