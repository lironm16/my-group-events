import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const body = await req.json();
  const { code, username, password, nickname, icon, groupId } = body as { code: string; username: string; password: string; nickname?: string; icon?: string; groupId?: string | null };
  if (!code || !username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const family = await prisma.family.findUnique({ where: { inviteCode: code } });
  if (!family) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
  const existing = await prisma.user.findFirst({ where: { OR: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }] } });
  if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 10);
  const isFirst = (await prisma.user.count()) === 0;
  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      name: nickname || username,
      image: icon ? `icon:${icon}` : null,
      passwordHash,
      role: isFirst ? 'admin' : 'member',
      familyId: family.id,
      groupId: groupId ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, userId: user.id });
}

