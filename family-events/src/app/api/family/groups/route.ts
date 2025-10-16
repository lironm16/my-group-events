import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (code) {
    // Unauthenticated listing by invite code for signup step (signup flow only)
    const family = await prisma.family.findUnique({ where: { inviteCode: code } });
    if (!family) {
      // Optional: preview-only mock for signup demos
      if (process.env.VERCEL_ENV === 'preview') {
        const mock = [
          { id: 'g1', nickname: 'הורים', members: [
            { id: 'u1', name: 'אבא', image: null },
            { id: 'u2', name: 'אמא', image: null },
          ]},
          { id: 'g2', nickname: 'ילדים', members: [
            { id: 'u3', name: 'דני', image: null },
            { id: 'u4', name: 'נועה', image: null },
          ]},
        ];
        return NextResponse.json({ groups: mock });
      }
      return NextResponse.json({ groups: [] });
    }
    const groups = await prisma.group.findMany({
      where: { familyId: family.id },
      include: { members: { select: { id: true, name: true, image: true } }, parent: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ groups });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user?.familyId) return NextResponse.json({ groups: [] });
  const groups = await prisma.group.findMany({
    where: { familyId: user.familyId },
    include: { members: { select: { id: true, name: true, image: true } }, parent: { select: { id: true, nickname: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user?.familyId) return NextResponse.json({ error: 'No family' }, { status: 400 });
  const body = await req.json();
  const nickname: string | undefined = body?.nickname;
  if (!nickname || !nickname.trim()) return NextResponse.json({ error: 'שם קבוצה חסר' }, { status: 400 });
  const existsGroup = await prisma.group.findFirst({ where: { familyId: user.familyId, nickname: nickname.trim() } });
  if (existsGroup) return NextResponse.json({ error: 'שם הקבוצה כבר קיים' }, { status: 400 });
  const group = await prisma.group.create({ data: { nickname: nickname.trim(), familyId: user.familyId } });
  return NextResponse.json({ group }, { status: 201 });
}

