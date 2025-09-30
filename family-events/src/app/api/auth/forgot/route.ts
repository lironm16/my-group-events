import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { identifier } = await req.json();
  if (!identifier) return NextResponse.json({ ok: true });

  const raw = String(identifier).trim();
  const idLower = raw.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: idLower },
        { email: idLower },
        { name: raw },
      ],
    } as any,
  });

  // Always return ok to avoid user enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });

  const link = `${process.env.NEXTAUTH_URL ?? ''}/reset?token=${token}`;

  // Attempt to send email if we have SMTP and user email
  try {
    if (user.email) {
      const nodemailer = await import('nodemailer');
      const tx = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      await tx.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@example.com',
        to: user.email,
        subject: 'קישור לאיפוס סיסמה',
        text: `איפוס סיסמה: ${link}`,
      });
    }
  } catch {}

  // For development, also return the link so you can click it directly
  const shouldReturnLink = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV !== 'production';
  return NextResponse.json({ ok: true, link: shouldReturnLink ? link : undefined });
}

