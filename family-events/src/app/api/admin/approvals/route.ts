import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import crypto from 'crypto';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me || me.role !== 'admin' || !me.familyId) return null;
  return me;
}

export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const users = await prisma.user.findMany({ where: { familyId: me.familyId, approved: false }, select: { id: true, name: true, email: true, image: true } });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { userId, action } = await req.json();
  if (!userId || !['approve','deny'].includes(action)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.familyId !== me.familyId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (action === 'approve') {
    // Mark approved only; do NOT attach to any family here
    await prisma.user.update({ where: { id: userId }, data: { approved: true } });
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await prisma.activationToken.create({ data: { token, userId, expiresAt } });
    const link = `${process.env.NEXTAUTH_URL ?? ''}/activate?token=${token}`;
    // Send activation email if SMTP is configured and user has an email
    if (target?.email && process.env.SMTP_HOST && process.env.SMTP_FROM) {
      try {
        const nodemailer = await import('nodemailer');
        const tx = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_PORT || '587') === '465',
          auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });
        await tx.sendMail({
          from: process.env.SMTP_FROM || 'no-reply@example.com',
          to: target.email,
          replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
          subject: 'אישור הרשמה - My Group Events',
          text: `שלום${target.name ? ' ' + target.name : ''},\n\nחשבונך אושר. נא להפעיל את החשבון באמצעות הקישור:\n${link}\n\nהקישור תקף ל-24 שעות.`,
        });
      } catch {
        // ignore send errors; admin action remains successful
      }
    }
  }
  if (action === 'deny') await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}

