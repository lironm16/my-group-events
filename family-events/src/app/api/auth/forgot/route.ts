import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { identifier } = await req.json();
  if (!identifier) return NextResponse.json({ ok: true });
  const idLower = String(identifier).toLowerCase();
  const user = await prisma.user.findFirst({ where: { OR: [ { username: idLower }, { name: idLower } ] } });
  if (!user) return NextResponse.json({ ok: true });
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
  const link = `${process.env.NEXTAUTH_URL ?? ''}/reset?token=${token}`;

  // Attempt to send email if SMTP is configured and user has an email
  const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_FROM;
  const canEmail = hasSmtp && !!user.email;
  if (canEmail) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_PORT || '587') === '465',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@example.com',
        to: String(user.email),
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
        subject: 'איפוס סיסמה - My Group Events',
        text: `שלום${user.name ? ' ' + user.name : ''},\n\nלחץ/י על הקישור הבא כדי לאפס סיסמה:\n${link}\n\nהקישור תקף ל-30 דקות.`,
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      // Fall through to dev link behavior
    }
  }

  // In development or when email is not configured, return the link for convenience
  const dev = process.env.NODE_ENV !== 'production';
  return NextResponse.json({ ok: true, link: dev ? link : undefined });
}

