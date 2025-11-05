import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { sendPushToUsersExcept } from '@/lib/push';
import { APP_NAME_HE } from '@/lib/constants';
import crypto from 'crypto';

function genderKey(g: string | null | undefined) {
  if (g === 'male' || g === 'female') return g;
  return 'other';
}

function genderWord(g: string | null | undefined, forms: { male: string; female: string; other: string }) {
  const key = genderKey(g);
  return forms[key as 'male' | 'female' | 'other'];
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true, name: true, gender: true, role: true, groupId: true } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const eventId: string = body.eventId;
  const status: 'APPROVED' | 'DECLINED' | 'MAYBE' | 'NA' | null = body.status ?? null;
  const note: string | null = body.note != null ? String(body.note) : null;
  const scope: 'self' | 'group' | 'all' = body.scope || 'self';

  // Load event and permissions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        hostId: true,
        familyId: true,
        title: true,
        id: true,
        rsvps: { select: { userId: true, user: { select: { gender: true, name: true } } } },
      },
    });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isHost = event.hostId === user.id || !!(await prisma.eventHost.findFirst({ where: { eventId, userId: user.id }, select: { id: true } }));
  const isAdmin = user.role === 'admin';

  // Determine target user ids
  let targetUserIds: string[] = [user.id];
  if (scope === 'group') {
    if (!user.groupId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const members = await prisma.user.findMany({ where: { groupId: user.groupId }, select: { id: true } });
    targetUserIds = members.map(m => m.id);
  }
  if (scope === 'all') {
    if (!(isHost || isAdmin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const members = await prisma.user.findMany({ where: { familyId: event.familyId }, select: { id: true } });
    targetUserIds = members.map(m => m.id);
  }

  // Apply RSVPs (allow comment-only updates)
  for (const uid of targetUserIds) {
    if (!status) {
      // No status change requested; only update note if RSVP exists
      const existing = await prisma.rSVP.findUnique({ where: { eventId_userId: { eventId, userId: uid } } });
      if (existing) {
        await prisma.rSVP.update({ where: { eventId_userId: { eventId, userId: uid } }, data: { note } });
      } else if (note != null && note.trim() !== '') {
        // Create with NA to store a comment
        await prisma.rSVP.create({ data: { eventId, userId: uid, status: 'NA', note } });
      }
    } else {
      await prisma.rSVP.upsert({
        where: { eventId_userId: { eventId, userId: uid } },
        create: { eventId, userId: uid, status: status as any, note },
        update: { status: status as any, note },
      });
    }
  }

  // Notify host(s) via push
    try {
      const coHosts = await prisma.eventHost.findMany({ where: { eventId }, select: { userId: true } });
      const hostRecipients = [event.hostId, ...coHosts.map(ch => ch.userId)];
      const statusLabels: Record<string, string> = {
        APPROVED: 'מגיע',
        DECLINED: 'לא מגיע',
        MAYBE: 'אולי',
        NA: 'ללא עדכון',
      };
      const actorName = (user.name && user.name.trim()) || (session.user.name as string | undefined) || 'מארח האירוע';
      const actor = actorName;
      const eventName = event.title || 'אירוע';
      const targetCount = targetUserIds.length;
      const targetGender = targetCount === 1 ? event.rsvps?.find((r) => r.userId === targetUserIds[0])?.user?.gender : null;
      const singularWithCount = genderWord(targetGender, { male: 'מוזמן אחד', female: 'מוזמנת אחת', other: 'מוזמן אחד' });
      const singularDefinite = genderWord(targetGender, { male: 'המוזמן', female: 'המוזמנת', other: 'המוזמן' });
      const participantPlural = `${targetCount} מוזמנים`;
      const labelForSentence = targetCount === 1 ? singularWithCount : participantPlural;
      const subjectForSentence = targetCount === 1 ? singularDefinite : participantPlural;

      const templates = status
        ? [
            `${actor} עדכן את הסטטוס ל"${statusLabels[status] || status}"`,
            `${actor} עדכן את הסטטוס של ${subjectForSentence} ל"${statusLabels[status] || status}"`,
            `הסטטוס עודכן ל"${statusLabels[status] || status}" עבור ${labelForSentence}`,
            `${actor} מסמן כעת "${statusLabels[status] || status}"`,
            `${labelForSentence} עודכנו ל"${statusLabels[status] || status}" על ידי ${actor}`,
          ]
        : [
            `${actor} הוסיף הערה באירוע`,
            `${actor} שיתף עדכון חדש`,
            `נוספה הערה חדשה באירוע`,
            `${actor} הוסיף הודעה – כדאי לבדוק`,
            `${actor} עדכן פרטים באירוע`,
          ];

      const hash = crypto.createHash('sha1');
      hash.update(`${event.id}:${Date.now()}:${targetUserIds.join(',')}:${status || 'note'}`);
      const digest = hash.digest('hex');
      const idx = parseInt(digest.slice(0, 6), 16) % templates.length;
      const bodyText = templates[idx];
      await sendPushToUsersExcept(hostRecipients, [user.id], {
        title: eventName,
        body: bodyText,
        url: `/events/${event.id}`,
        tag: `rsvp-${event.id}`,
      });
    } catch (err) {
    console.error('[push] Failed to enqueue RSVP notification', err);
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

