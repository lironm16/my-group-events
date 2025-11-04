import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'חסרים מפתחות VAPID. עדכנו את משתני הסביבה.' }, { status: 500 });
  }

  const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true, name: true } });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscriptionCount = await prisma.pushSubscription.count({ where: { userId: user.id } });
  if (!subscriptionCount) {
    return NextResponse.json({ error: 'לא נמצאה הרשמה להתראות במכשיר הנוכחי. ודאו שהרשיתם קבלת התראות.' }, { status: 409 });
  }

  await sendPushToUsers([user.id], {
    title: 'בדיקת התראות',
    body: 'הרשמת ההתראות פעילה והודעת בדיקה נשלחה בהצלחה.',
    url: '/settings/prefs/notifications',
    tag: 'push-test',
  });

  return NextResponse.json({ ok: true });
}

