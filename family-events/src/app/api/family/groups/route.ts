import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user?.familyId) return NextResponse.json({ groups: [] });
  const groups = await prisma.group.findMany({ where: { familyId: user.familyId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user?.familyId) return NextResponse.json({ error: 'No family' }, { status: 400 });
  const body = await req.json();
  const nickname: string | undefined = body?.nickname;
  if (!nickname || !nickname.trim()) return NextResponse.json({ error: 'Missing nickname' }, { status: 400 });
  const group = await prisma.group.create({ data: { nickname: nickname.trim(), familyId: user.familyId } });
  return NextResponse.json({ group }, { status: 201 });
}

