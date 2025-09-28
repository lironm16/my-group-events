import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, groupId } = await req.json();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  const family = await prisma.family.findUnique({ where: { inviteCode: code } });
  if (!family) return NextResponse.json({ error: 'Invalid code' }, { status: 404 });

  await prisma.user.update({ where: { id: user.id }, data: { familyId: family.id, groupId: groupId ?? undefined } });
  return NextResponse.json({ ok: true, familyId: family.id });
}

