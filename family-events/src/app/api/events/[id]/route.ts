import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { rsvps: { include: { user: true } }, host: true } });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ event });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.hostId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      startAt: body.startAt ? parseClientDate(body.startAt) : undefined,
      endAt: body.endAt ? parseClientDate(body.endAt) : undefined,
      externalLink: body.externalLink ?? null,
      isHolidayGenerated: body.holidayKey !== undefined ? !!body.holidayKey : undefined,
      holidayKey: body.holidayKey ?? undefined,
    },
  });
  return NextResponse.json({ event });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing) return new NextResponse(null, { status: 204 });
  if (existing.hostId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.event.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

function parseClientDate(input: string): Date {
  if (!input) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(input);
}

