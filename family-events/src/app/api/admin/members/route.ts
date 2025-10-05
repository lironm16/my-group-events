import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me || me.role !== 'admin' || !me.familyId) return null;
  return me;
}

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { userId, action } = body as { userId: string; action: 'promote' | 'demote' | 'remove' };
  if (!userId || !action) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if (userId === me.id) return NextResponse.json({ error: 'Cannot modify self' }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.familyId !== me.familyId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (action === 'promote') await prisma.user.update({ where: { id: userId }, data: { role: 'admin' }, select: { id: true } });
  if (action === 'demote') await prisma.user.update({ where: { id: userId }, data: { role: 'member' }, select: { id: true } });
  if (action === 'remove') await prisma.user.update({ where: { id: userId }, data: { familyId: null, groupId: null, role: 'member' }, select: { id: true } });
  return NextResponse.json({ ok: true });
}

