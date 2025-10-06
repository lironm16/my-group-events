import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: 'Missing' }, { status: 400 });
  const rec = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!rec || rec.expiresAt < new Date()) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  // Use raw query to avoid any schema-column drift on User
  await prisma.$executeRawUnsafe('UPDATE "User" SET "passwordHash" = $1 WHERE "id" = $2', hash, rec.userId);
  await prisma.passwordResetToken.delete({ where: { token } });
  return NextResponse.json({ ok: true });
}

