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
  const eventId: string = body.eventId;
  const status: 'APPROVED' | 'DECLINED' | 'MAYBE' = body.status;
  const note: string | null = body.note ?? null;
  const scope: 'self' | 'group' | 'all' = body.scope || 'self';

  // Load event and permissions
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { hostId: true, familyId: true } });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const isHost = event.hostId === user.id;
  const isAdmin = user.role === 'admin';

  // Determine target user ids
  let targetUserIds: string[] = [user.id];
  if ((scope === 'group') && user.groupId) {
    const members = await prisma.user.findMany({ where: { groupId: user.groupId }, select: { id: true } });
    targetUserIds = members.map(m => m.id);
  }
  if (scope === 'all') {
    if (!(isHost || isAdmin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const members = await prisma.user.findMany({ where: { familyId: event.familyId }, select: { id: true } });
    targetUserIds = members.map(m => m.id);
  }

  // Apply RSVPs
  for (const uid of targetUserIds) {
    await prisma.rSVP.upsert({
      where: { eventId_userId: { eventId, userId: uid } },
      create: { eventId, userId: uid, status, note },
      update: { status, note },
    });
  }
  // Notify host by email if enabled
  try {
    const host = await prisma.user.findUnique({ where: { id: event.hostId }, select: { email: true, notifyRsvpEmails: true, name: true } });
    if (host?.email && host.notifyRsvpEmails) {
      const nodemailer = await import('nodemailer');
      const tx = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const who = targetUserIds.length === 1 ? 'משתמש אחד' : `${targetUserIds.length} משתמשים`;
      const subject = `RSVP התעדכן לאירוע`;
      const text = `שלום ${host.name || ''},\n\nבעקבות פעולה באפליקציה התעדכנו אישורי הגעה (${who}).\nסטטוס: ${status}${note ? `\nהערה: ${note}` : ''}.\n\n`;
      await tx.sendMail({ from: process.env.SMTP_FROM, to: host.email, subject, text, replyTo: process.env.SMTP_REPLY_TO });
    }
  } catch {}
  return NextResponse.json({ ok: true, updated: targetUserIds.length });
}

