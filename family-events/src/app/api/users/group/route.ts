import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const groupId: string | null = body?.groupId ?? null;

  if (groupId) {
    // Ensure the selected group belongs to the same family
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true, familyId: true, nickname: true } });
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!me.familyId || group.familyId !== me.familyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await prisma.user.update({ where: { id: me.id }, data: { groupId: group.id } });
    return NextResponse.json({ ok: true, group: { id: group.id, nickname: group.nickname } });
  }

  // Clear selection
  await prisma.user.update({ where: { id: me.id }, data: { groupId: null } });
  return NextResponse.json({ ok: true, group: null });
}

