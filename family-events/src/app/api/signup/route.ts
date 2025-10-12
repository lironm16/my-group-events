import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const body = await req.json();
  const { code, password, nickname, groupId, email, imageUrl, newGroup, familyName } = body as { code: string; password: string; nickname?: string; groupId?: string | null; email: string; imageUrl?: string | null; newGroup?: string | null; familyName?: string };
  const missing: string[] = [];
  // Invite code should come from the link; do not require manual entry
  const rawNickname = (nickname ?? '').trim();
  if (!rawNickname) missing.push('כינוי');
  if (!email) missing.push('אימייל');
  if (!password) missing.push('סיסמה');
  if (missing.length) return NextResponse.json({ error: `שדות חסרים: ${missing.join(', ')}` }, { status: 400 });
  const emailLower = (email || '').trim().toLowerCase();
  let family = null as null | { id: string };
  if (code) {
    const f = await prisma.family.findUnique({ where: { inviteCode: code } });
    if (f) family = { id: f.id };
  }
  // בדיקת ייחודיות דוא"ל
  const existingEmail = await prisma.user.findFirst({ where: { email: { equals: emailLower, mode: 'insensitive' } } });
  if (existingEmail) return NextResponse.json({ error: 'האימייל כבר בשימוש' }, { status: 400 });
  // אימייל חייב להיות ייחודי במערכת
  const passwordHash = await bcrypt.hash(password, 10);
  const isFirst = (await prisma.user.count()) === 0;
  let finalGroupId = groupId ?? undefined;
  // If no family via code: create a family ONLY for the very first user.
  if (!family && isFirst) {
    const name = (familyName && familyName.trim()) || (nickname && nickname.trim()) || 'המשפחה שלי';
    // Try to generate a unique invite code with a few attempts
    let created: { id: string } | null = null;
    for (let i = 0; i < 5 && !created; i++) {
      const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
      const exists = await prisma.family.findUnique({ where: { inviteCode } }).catch(() => null);
      if (exists) continue;
      created = await prisma.family.create({ data: { name, inviteCode } }).catch(() => null);
    }
    if (!created) return NextResponse.json({ error: 'לא ניתן ליצור קוד הזמנה, נסו שוב' }, { status: 500 });
    family = { id: created.id };
  }
  // If invite-code flow is not used, allow skipping group creation
  if (!finalGroupId && newGroup && newGroup.trim()) {
    if (!family) {
      return NextResponse.json({ error: 'נדרש קוד הזמנה למשפחה כדי ליצור קבוצה חדשה' }, { status: 400 });
    }
    const existsGroup = await prisma.group.findFirst({ where: { familyId: family.id, nickname: newGroup.trim() } });
    if (existsGroup) return NextResponse.json({ error: 'שם הקבוצה כבר קיים' }, { status: 400 });
    const g = await prisma.group.create({ data: { nickname: newGroup.trim(), familyId: family.id } });
    finalGroupId = g.id;
  }
  try {
    const user = await prisma.user.create({
      data: {
        name: rawNickname,
        image: imageUrl || null,
        email: emailLower,
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
      if (targetStr.includes('email')) {
        return NextResponse.json({ error: 'האימייל כבר בשימוש' }, { status: 400 });
      }
      if (targetStr.includes('group') && targetStr.includes('nickname')) {
        return NextResponse.json({ error: 'שם הקבוצה כבר קיים' }, { status: 400 });
      }
      if (targetStr.includes('family') && (targetStr.includes('invite') || targetStr.includes('code'))) {
        return NextResponse.json({ error: 'קוד הזמנה כבר בשימוש, נסו שוב' }, { status: 400 });
      }
      return NextResponse.json({ error: 'אירעה שגיאה בהרשמה' }, { status: 400 });
    }
    return NextResponse.json({ error: 'אירעה שגיאה בהרשמה' }, { status: 500 });
  }
}

