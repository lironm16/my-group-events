import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import crypto from 'crypto';

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
    // Mark approved only; do NOT attach to any family here
    await prisma.user.update({ where: { id: userId }, data: { approved: true } });
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await prisma.activationToken.create({ data: { token, userId, expiresAt } });
    // TODO: send email to user with activation link
    // e.g., `${process.env.NEXTAUTH_URL ?? ''}/activate?token=${token}`
  }
  if (action === 'deny') await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}

