import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = String(searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'missing' }, { status: 400 });
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } as any } as any });
  return NextResponse.json({ available: !existing });
}
