import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Ensure membership exists for current active family (backfill)
  if (me.familyId) {
    const existing = await prisma.familyMembership.findFirst({ where: { userId: me.id, familyId: me.familyId } });
    if (!existing) {
      try {
        await prisma.familyMembership.create({ data: { userId: me.id, familyId: me.familyId, role: me.role || 'member' } });
      } catch {}
    }
  }

  const memberships = await prisma.familyMembership.findMany({
    where: { userId: me.id },
    include: { family: { select: { id: true, name: true, inviteCode: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const families = memberships.map((m) => ({ id: m.family.id, name: m.family.name, inviteCode: m.family.inviteCode }));
  return NextResponse.json({ families, activeFamilyId: me.familyId || null });
}
