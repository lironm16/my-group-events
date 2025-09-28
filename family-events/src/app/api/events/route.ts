import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '12')));
  const where = { OR: [{ hostId: user.id }, { familyId: user.familyId ?? undefined }] };
  const total = await prisma.event.count({ where });
  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: { rsvps: true, host: true },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return NextResponse.json({ events, page, pageSize, total });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const event = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      externalLink: body.externalLink ?? null,
      isHolidayGenerated: body.holidayKey ? true : false,
      holidayKey: body.holidayKey ?? null,
      hostId: user.id,
      familyId: user.familyId ?? null,
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}

