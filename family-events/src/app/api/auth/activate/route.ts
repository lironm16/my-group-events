import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const rec = await prisma.activationToken.findUnique({ where: { token } });
  if (!rec || rec.expiresAt < new Date()) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  // Activation: keep user approved, do nothing else here
  await prisma.activationToken.delete({ where: { token } });
  return NextResponse.json({ ok: true });
}

