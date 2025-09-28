import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { theme } = await req.json();
  if (theme !== 'light' && theme !== 'dark') return NextResponse.json({ error: 'Bad theme' }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await (prisma as any).user.update({ where: { id: user.id }, data: { theme } });
  return NextResponse.json({ ok: true });
}

