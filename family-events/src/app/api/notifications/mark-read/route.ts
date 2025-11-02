import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { markNotificationsRead } from '@/lib/notifications';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let ids: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
    }
  } catch {
    // ignore JSON parsing errors; treat as mark-all
  }

  const count = await markNotificationsRead(user.id, ids);
  return NextResponse.json({ updated: count });
}
