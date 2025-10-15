import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // Credentials requires JWT strategy
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: { label: 'Email', type: 'text' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        const rawId = (credentials?.email as string | undefined)?.trim();
        const email = rawId?.toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!rawId || !password) return null;
        // Email-only login
        const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } as any } as any });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
        (token as any).approved = (user as any).approved;
        (token as any).image = (user as any).image;
        (token as any).name = (user as any).name;
        (token as any).email = (user as any).email;
      }
      if (trigger === 'update' && session) {
        const s: any = session;
        if (typeof s.name === 'string') (token as any).name = s.name;
        if (typeof s.email === 'string') (token as any).email = s.email;
        if (typeof s.image === 'string') (token as any).image = s.image;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = (token as any).id ?? token.sub;
      (session.user as any).role = (token as any).role;
      (session.user as any).image = (token as any).image ?? (session.user as any).image;
      (session.user as any).name = (token as any).name ?? (session.user as any).name;
      (session.user as any).email = (token as any).email ?? (session.user as any).email;
      return session;
    },
    async signIn({ user }) {
      // Allow only approved users to sign in; admins can always sign in
      const role = (user as any).role;
      const approved = (user as any).approved;
      // Bootstrap: if there are no admins yet, promote this user and approve
      const admins = await prisma.user.count({ where: { role: 'admin' } });
      if (admins === 0) {
        try {
          await (prisma as any).user.update({ where: { id: (user as any).id }, data: { role: 'admin', approved: true } });
        } catch {}
        return true;
      }
      if (role === 'admin') return true;
      if (approved === false) {
        // Notify admins on pending login attempt
        try {
          const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { email: true } });
          const targets = admins.map(a => a.email).filter(Boolean) as string[];
          if (targets.length) {
            const nodemailer = await import('nodemailer');
            const tx = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              secure: false,
              auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
            });
            const approveUrl = `${process.env.NEXTAUTH_URL ?? ''}/settings`;
            await tx.sendMail({
              from: process.env.SMTP_FROM || 'no-reply@example.com',
              to: targets.join(','),
              subject: 'בקשת משתמש ממתינה לאישור',
              text: `משתמש חדש ניסה להתחבר וממתין לאישור. לאישור/דחייה: ${approveUrl}`,
            });
          }
        } catch {}
        return false;
      }
      return true;
    },
  },
};

