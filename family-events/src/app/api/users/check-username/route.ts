import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const u = (searchParams.get('u') || '').toLowerCase().trim();
  if (!u) return NextResponse.json({ available: false });
  const existing = await prisma.user.findFirst({ where: { username: u } });
  return NextResponse.json({ available: !existing });
}

