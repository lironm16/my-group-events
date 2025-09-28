import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const rsvp = await prisma.rSVP.upsert({
    where: { eventId_userId: { eventId: body.eventId, userId: user.id } },
    create: { eventId: body.eventId, userId: user.id, status: body.status, note: body.note ?? null },
    update: { status: body.status, note: body.note ?? null },
  });
  return NextResponse.json({ rsvp }, { status: 201 });
}

