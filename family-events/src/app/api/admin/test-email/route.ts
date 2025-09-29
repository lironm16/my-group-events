import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { to } = await req.json().catch(() => ({}));
  const dest = (typeof to === 'string' && to) || session.user.email || process.env.SMTP_FROM;
  if (!dest) return NextResponse.json({ error: 'No destination' }, { status: 400 });

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
      to: dest,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
      subject: 'בדיקת דוא"ל - My Group Events',
      text: 'זהו מייל בדיקה. אם קיבלת את ההודעה הזאת, ההגדרות תקינות.',
    });
    return NextResponse.json({ ok: true, sentTo: dest });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Send failed' }, { status: 500 });
  }
}

