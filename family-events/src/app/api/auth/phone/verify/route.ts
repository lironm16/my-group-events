import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { phone, code } = await req.json();
  if (!phone || !code) return NextResponse.json({ error: 'פרטים חסרים' }, { status: 400 });
  const rec = await prisma.phoneVerification.findUnique({ where: { phone } });
  if (!rec || rec.used || rec.code !== String(code) || rec.expiresAt < new Date()) {
    return NextResponse.json({ error: 'קוד לא תקף' }, { status: 400 });
  }
  await prisma.phoneVerification.update({ where: { phone }, data: { used: true } });
  return NextResponse.json({ ok: true });
}

