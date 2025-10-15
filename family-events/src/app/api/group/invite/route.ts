import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < length; i++) res += chars[Math.floor(Math.random() * chars.length)];
  return res;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me?.groupId) return NextResponse.json({ error: 'No active group' }, { status: 400 });
  let group = await prisma.group.findUnique({ where: { id: me.groupId }, select: { id: true, inviteCode: true, nickname: true, parentId: true } });
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  while (group.parentId) {
    const parent = await prisma.group.findUnique({ where: { id: group.parentId }, select: { id: true, inviteCode: true, nickname: true, parentId: true } });
    if (!parent) break;
    group = parent;
  }
  return NextResponse.json({ inviteCode: group.inviteCode || null, groupId: group.id, nickname: group.nickname });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me?.groupId) return NextResponse.json({ error: 'No active group' }, { status: 400 });
  let group = await prisma.group.findUnique({ where: { id: me.groupId }, select: { id: true, inviteCode: true, nickname: true, parentId: true } });
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  while (group.parentId) {
    const parent = await prisma.group.findUnique({ where: { id: group.parentId }, select: { id: true, inviteCode: true, nickname: true, parentId: true } });
    if (!parent) break;
    group = parent;
  }
  // Only allow members of the same family; admins can always regenerate via family route
  // Here we simply allow any current group member to generate a code for the group
  let code: string = generateCode();
  while (await prisma.group.findFirst({ where: { inviteCode: code } })) {
    code = generateCode();
  }
  const updated = await prisma.group.update({ where: { id: group.id }, data: { inviteCode: code } });
  return NextResponse.json({ inviteCode: updated.inviteCode, groupId: updated.id, nickname: group.nickname });
}
