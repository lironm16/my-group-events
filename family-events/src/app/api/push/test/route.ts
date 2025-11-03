import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureWebPushConfigured } from '@/lib/webPush';
import { sendPushToUser } from '@/lib/pushNotifications';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '?? ?????.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { pushSubscriptions: true },
  });
  if (!user) {
    return NextResponse.json({ error: '?? ?????.' }, { status: 401 });
  }

  try {
    ensureWebPushConfigured();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  if (!user.pushSubscriptions.length) {
    return NextResponse.json({ error: '??? ????? ????? ??????? ?????? ??.' }, { status: 400 });
  }

  try {
    await sendPushToUser(user.id, {
      title: '????? ??????',
      body: '????? ????? ????? ??????.',
      data: { url: '/' },
    });
  } catch (error) {
    console.error('Failed to send test push', error);
    return NextResponse.json({ error: '????? ?????? ?????.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
