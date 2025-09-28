import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { identifier } = await req.json();
  if (!identifier) return NextResponse.json({ ok: true });
  const idLower = String(identifier).toLowerCase();
  const user = await prisma.user.findFirst({ where: { OR: [ { username: idLower }, { name: idLower } ] } });
  if (!user) return NextResponse.json({ ok: true });
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
  // TODO: send email. For now, just log or return link (dev only)
  const link = `${process.env.NEXTAUTH_URL ?? ''}/reset?token=${token}`;
  return NextResponse.json({ ok: true, link });
}

