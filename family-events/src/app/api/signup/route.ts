import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const body = await req.json();
  const { code, username, password, nickname, icon, groupId, email, imageUrl, newGroup, familyName } = body as { code: string; username?: string; password: string; nickname?: string; icon?: 'mom' | 'dad' | 'boy' | 'girl' | undefined; groupId?: string | null; email: string; imageUrl?: string | null; newGroup?: string | null; familyName?: string };
  const missing: string[] = [];
  // Invite code should come from the link; do not require manual entry
  const rawUsername = (username ?? '').trim();
  const rawNickname = (nickname ?? '').trim();
  const finalUsername = rawUsername || rawNickname;
  if (!finalUsername) missing.push('שם משתמש');
  if (!email) missing.push('אימייל');
  if (!password) missing.push('סיסמה');
  if (!icon) missing.push('אייקון');
  if (!nickname || !nickname.trim()) missing.push('כינוי');
  if (missing.length) return NextResponse.json({ error: `שדות חסרים: ${missing.join(', ')}` }, { status: 400 });
  let family = null as null | { id: string };
  if (code) {
    const f = await prisma.family.findUnique({ where: { inviteCode: code } });
    if (f) family = { id: f.id };
  }
  // בדיקת ייחודיות שם משתמש
  const usernameLower = finalUsername.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { username: usernameLower } });
  if (existing) return NextResponse.json({ error: 'שם המשתמש כבר תפוס' }, { status: 400 });
  // אין בדיקת ייחודיות אימייל (אימייל אינו ייחודי במערכת)
  const passwordHash = await bcrypt.hash(password, 10);
  const isFirst = (await prisma.user.count()) === 0;
  let finalGroupId = groupId ?? undefined;
  // If no family via code: create a family ONLY for the very first user.
  if (!family && isFirst) {
    const name = (familyName && familyName.trim()) || (nickname && nickname.trim()) || `המשפחה של ${username}`;
    const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const created = await prisma.family.create({ data: { name, inviteCode } });
    family = { id: created.id };
  }
  // If invite-code flow is not used, allow skipping group creation (only when a family exists)
  if (!finalGroupId && newGroup && newGroup.trim() && family) {
    const famId = family.id;
    const existsGroup = await prisma.group.findFirst({ where: { familyId: famId, nickname: newGroup.trim() } });
    if (existsGroup) return NextResponse.json({ error: 'שם הקבוצה כבר קיים' }, { status: 400 });
    const g = await prisma.group.create({ data: { nickname: newGroup.trim(), familyId: famId } });
    finalGroupId = g.id;
  }
  try {
    const user = await prisma.user.create({
      data: {
        username: usernameLower,
        name: rawNickname || finalUsername,
        image: imageUrl || (icon ? `icon:${icon}` : null),
        email: email.toLowerCase(),
        passwordHash,
        role: isFirst ? 'admin' : 'member',
        familyId: family?.id ?? null,
        groupId: finalGroupId,
      },
    });
    if (isFirst) {
      // Ensure first user is approved and admin for immediate access
      try {
        await (prisma as any).user.update({ where: { id: user.id }, data: { approved: true, role: 'admin' } });
      } catch {}
    }
    if (isFirst && family && familyName && familyName.trim()) {
      await prisma.family.update({ where: { id: family.id }, data: { name: familyName.trim() } });
    }
    return NextResponse.json({ ok: true, userId: user.id, pending: !isFirst });
  } catch (err: any) {
    // Prisma unique constraint (P2002) - target may be array of fields or constraint name string
    try { console.error('signup_error', { code: err?.code, meta: err?.meta }); } catch {}
    if (err?.code === 'P2002') {
      const rawTarget = err?.meta?.target;
      const targetStr = Array.isArray(rawTarget)
        ? String(rawTarget.join(',')).toLowerCase()
        : String(rawTarget || '').toLowerCase();
      if (targetStr.includes('username')) {
        return NextResponse.json({ error: 'שם המשתמש כבר תפוס' }, { status: 400 });
      }
      // לא מחזירים שגיאה על אימייל בשימוש כי האימייל אינו ייחודי
      // Fallback when field not parsed
      return NextResponse.json({ error: 'שם המשתמש או האימייל כבר קיימים' }, { status: 400 });
    }
    return NextResponse.json({ error: 'אירעה שגיאה בהרשמה' }, { status: 500 });
  }
}

