import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { identifier } = await req.json();
  if (!identifier) return NextResponse.json({ ok: true });
  const idLower = String(identifier).toLowerCase();
  const user = await prisma.user.findFirst({ where: { OR: [ { username: idLower }, { name: idLower } ] }, select: { id: true, email: true, name: true } });
  if (!user) return NextResponse.json({ ok: true });
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
  const reqUrl = new URL(req.url);
  const originEnv = process.env.NEXTAUTH_URL;
  const base = originEnv && originEnv.startsWith('http') ? originEnv : `${reqUrl.protocol}//${reqUrl.host}`;
  const link = `${base.replace(/\/$/, '')}/reset?token=${token}`;
  try {
    const nodemailer = await import('nodemailer');
    const tx = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_PORT || '587') === '465',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    if (user.email) {
      await tx.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@example.com',
        to: user.email,
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
        subject: 'איפוס סיסמה - My Group Events',
        text: `שלום${user.name ? ' ' + user.name : ''},\n\nלקבלת סיסמה חדשה, היכנס לקישור הבא:\n${link}\n\nאם לא ביקשת איפוס, ניתן להתעלם מהודעה זו.`,
        html: `שלום${user.name ? ' ' + user.name : ''},<br/><br/>לקבלת סיסמה חדשה, לחץ על הקישור:<br/><a href="${link}">איפוס סיסמה</a><br/><br/>אם לא ביקשת איפוס, ניתן להתעלם מהודעה זו.`,
      });
    }
  } catch (e) {
    console.error('[auth/forgot] Email send failed', e);
  }
  return NextResponse.json({ ok: true, link });
}

