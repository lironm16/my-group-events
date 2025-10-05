import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: 'Missing' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password too short' }, { status: 400 });
  }
  try {
    const rec = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!rec || rec.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: hash } });
    await prisma.passwordResetToken.delete({ where: { token } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[auth/reset] Password reset failed', { token: String(token).slice(0, 6), error: e });
    return NextResponse.json({ error: 'Reset failed', detail: e?.message || 'Unknown error' }, { status: 500 });
  }
}

