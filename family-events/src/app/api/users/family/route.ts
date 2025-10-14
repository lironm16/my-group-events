import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { familyId } = await req.json().catch(() => ({} as any));
  if (!familyId) return NextResponse.json({ error: 'Missing familyId' }, { status: 400 });

  const membership = await prisma.familyMembership.findFirst({ where: { userId: me.id, familyId } });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.user.update({ where: { id: me.id }, data: { familyId, groupId: null } });
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  return NextResponse.json({ ok: true, family: family ? { id: family.id, name: family.name } : null });
}
