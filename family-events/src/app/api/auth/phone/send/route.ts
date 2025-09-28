import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { phone } = await req.json();
  if (!phone || typeof phone !== 'string') return NextResponse.json({ error: 'מספר טלפון חסר' }, { status: 400 });
  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
  await prisma.phoneVerification.upsert({
    where: { phone },
    update: { code, expiresAt, used: false },
    create: { phone, code, expiresAt },
  });
  // TODO: integrate SMS provider (Twilio). In dev, return code for display.
  const dev = process.env.NODE_ENV !== 'production';
  return NextResponse.json({ ok: true, devCode: dev ? code : undefined });
}

