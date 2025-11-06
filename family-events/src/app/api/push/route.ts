import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

type SubscriptionPayload = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { subscription?: SubscriptionPayload; userAgent?: string; platform?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const subscription = payload?.subscription;
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!p256dh || !auth) {
    return NextResponse.json({ error: 'Missing keys' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      userId: user.id,
      userAgent: payload?.userAgent?.slice(0, 500) || null,
      platform: payload?.platform?.slice(0, 120) || null,
    },
    update: {
      p256dh,
      auth,
      userId: user.id,
      userAgent: payload?.userAgent?.slice(0, 500) || null,
      platform: payload?.platform?.slice(0, 120) || null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { endpoint?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload?.endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint: payload.endpoint, userId: user.id } });

  return NextResponse.json({ ok: true });
}

