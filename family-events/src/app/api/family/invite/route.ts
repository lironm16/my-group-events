import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < length; i++) res += chars[Math.floor(Math.random() * chars.length)];
  return res;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Family invites are deprecated; use group invites. Keep endpoint for backward compatibility.
  const family = user.familyId ? await prisma.family.findUnique({ where: { id: user.familyId } }) : null;
  return NextResponse.json({ inviteCode: family?.inviteCode ?? null, familyId: family?.id ?? null, deprecated: true });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user?.familyId || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let code: string = generateCode();
  while (await prisma.family.findUnique({ where: { inviteCode: code } })) {
    code = generateCode();
  }
  const family = await prisma.family.update({ where: { id: user.familyId }, data: { inviteCode: code } });
  return NextResponse.json({ inviteCode: family.inviteCode, familyId: family.id });
}

