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
  const me = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true } });
  if (!me?.familyId) return NextResponse.json({ error: 'No family/group context' }, { status: 400 });
  const myFamilyId: string = me.familyId as string;
  const myGroupId: string | null = me.groupId ?? null;
  const myFamilyName: string = me.family?.name || 'קבוצה ראשית';

  // Resolve main (top-level) group: user's current group root, or family's root group; create if missing
  async function resolveMainGroup() {
    if (myGroupId) {
      const found = await prisma.group.findUnique({ where: { id: myGroupId }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
      if (found) {
        let g = found;
        while (g.parentId) {
          const parent = await prisma.group.findUnique({ where: { id: g.parentId }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
          if (!parent) break;
          g = parent as typeof g;
        }
        return g;
      }
    }
    // fallback: family's root group
    let root = await prisma.group.findFirst({ where: { familyId: myFamilyId, parentId: null }, orderBy: { createdAt: 'asc' }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
    if (!root) {
      const nickname = myFamilyName;
      root = await prisma.group.create({ data: { nickname, familyId: myFamilyId }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
    }
    return root;
  }

  const group = await resolveMainGroup();
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!group.inviteCode) {
    // Pre-generate an invite code if missing
    let code = generateCode();
    while (await prisma.group.findFirst({ where: { inviteCode: code } })) code = generateCode();
    const updated = await prisma.group.update({ where: { id: group.id }, data: { inviteCode: code }, select: { inviteCode: true, nickname: true, id: true } });
    return NextResponse.json({ inviteCode: updated.inviteCode, groupId: updated.id, nickname: updated.nickname });
  }
  return NextResponse.json({ inviteCode: group.inviteCode, groupId: group.id, nickname: group.nickname });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true } });
  if (!me?.familyId) return NextResponse.json({ error: 'No family/group context' }, { status: 400 });
  const myFamilyId: string = me.familyId as string;
  const myGroupId: string | null = me.groupId ?? null;
  const myFamilyName: string = me.family?.name || 'קבוצה ראשית';

  // Resolve main group same as GET
  async function resolveMainGroup() {
    if (myGroupId) {
      const found = await prisma.group.findUnique({ where: { id: myGroupId }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
      if (found) {
        let g = found;
        while (g.parentId) {
          const parent = await prisma.group.findUnique({ where: { id: g.parentId }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
          if (!parent) break;
          g = parent as typeof g;
        }
        return g;
      }
    }
    let root = await prisma.group.findFirst({ where: { familyId: myFamilyId, parentId: null }, orderBy: { createdAt: 'asc' }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
    if (!root) {
      const nickname = myFamilyName;
      root = await prisma.group.create({ data: { nickname, familyId: myFamilyId }, select: { id: true, inviteCode: true, nickname: true, parentId: true, familyId: true } });
    }
    return root;
  }

  const group = await resolveMainGroup();
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Generate a fresh code
  let code: string = generateCode();
  while (await prisma.group.findFirst({ where: { inviteCode: code } })) code = generateCode();
  const updated = await prisma.group.update({ where: { id: group.id }, data: { inviteCode: code }, select: { inviteCode: true, id: true, nickname: true } });
  return NextResponse.json({ inviteCode: updated.inviteCode, groupId: updated.id, nickname: updated.nickname });
}
