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
      credentials: { username: { label: 'Username', type: 'text' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        const rawId = (credentials?.username as string | undefined)?.trim();
        const username = rawId?.toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!rawId || !password) return null;
        // Allow login by username, nickname, or phone (no email)
        const user = await prisma.user.findFirst({ where: { OR: [ { username }, { name: username }, { phone: rawId as any } ] } as any });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
        (token as any).approved = (user as any).approved;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = (token as any).id ?? token.sub;
      (session.user as any).role = (token as any).role;
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
      if (approved === false) return false;
      return true;
    },
  },
};

