import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const body = await req.json();
  const { code, username, password, nickname, icon, groupId, email, imageUrl, newGroup, familyName } = body as { code: string; username: string; password: string; nickname?: string; icon?: 'mom' | 'dad' | 'boy' | 'girl' | undefined; groupId?: string | null; email: string; imageUrl?: string | null; newGroup?: string | null; familyName?: string };
  const missing: string[] = [];
  // Invite code should come from the link; do not require manual entry
  if (!username) missing.push('שם משתמש');
  if (!email) missing.push('אימייל');
  if (!password) missing.push('סיסמה');
  if (!icon) missing.push('אייקון');
  if (missing.length) return NextResponse.json({ error: `שדות חסרים: ${missing.join(', ')}` }, { status: 400 });
  let family = null as null | { id: string };
  if (code) {
    const f = await prisma.family.findUnique({ where: { inviteCode: code } });
    if (f) family = { id: f.id };
  }
  const existing = await prisma.user.findFirst({ where: { OR: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] } });
  if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 10);
  const isFirst = (await prisma.user.count()) === 0;
  let finalGroupId = groupId ?? undefined;
  // If no family via code, create a new family for this user
  if (!family) {
    const name = (familyName && familyName.trim()) || (nickname && nickname.trim()) || `המשפחה של ${username}`;
    // generate a simple inviteCode placeholder (not used now)
    const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const created = await prisma.family.create({ data: { name, inviteCode } });
    family = { id: created.id };
  }
  if (!finalGroupId && newGroup && newGroup.trim()) {
    const g = await prisma.group.create({ data: { nickname: newGroup.trim(), familyId: family.id } });
    finalGroupId = g.id;
  }
  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      name: nickname || username,
      image: imageUrl || (icon ? `icon:${icon}` : null),
      email: email.toLowerCase(),
      passwordHash,
      role: isFirst ? 'admin' : 'member',
      approved: isFirst ? true : false,
      familyId: family.id,
      groupId: finalGroupId,
    },
  });
  if (isFirst && familyName && familyName.trim()) {
    await prisma.family.update({ where: { id: family.id }, data: { name: familyName.trim() } });
  }
  return NextResponse.json({ ok: true, userId: user.id });
}

