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

export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const users = await prisma.user.findMany({ where: { familyId: me.familyId, approved: false }, select: { id: true, name: true, email: true, username: true, image: true } });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { userId, action } = await req.json();
  if (!userId || !['approve','deny'].includes(action)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.familyId !== me.familyId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (action === 'approve') {
    await prisma.user.update({ where: { id: userId }, data: { approved: true, familyId: me.familyId } });
  }
  if (action === 'deny') await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}

