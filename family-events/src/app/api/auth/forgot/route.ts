import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username: string | undefined = (body?.username ?? '').trim() || undefined;
  const email: string | undefined = (body?.email ?? '').trim() || undefined;
  const name: string | undefined = (body?.name ?? '').trim() || undefined;

  // Username path (unique)
  let user = null as null | { id: string; email: string | null };
  if (username) {
    const u = await prisma.user.findFirst({ where: { username: username.toLowerCase() } as any, select: { id: true, email: true } });
    user = u ?? null;
  } else if (email && name) {
    // Name + email path (disambiguate duplicates)
    const found = await prisma.user.findMany({
      where: {
        email: { equals: email.toLowerCase(), mode: 'insensitive' },
        name: { equals: name, mode: 'insensitive' },
      } as any,
      select: { id: true, email: true },
    });
    user = found.length === 1 ? found[0] : null;
  } else {
    // Insufficient info; respond OK without revealing
    return NextResponse.json({ ok: true });
  }

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

