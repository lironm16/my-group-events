import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: { signIn: '/signin' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { username: { label: 'Username', type: 'text' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        const username = (credentials?.username as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;
        const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: username }] } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach user.id to session for server components usage
      (session.user as any).id = user.id;
      (session.user as any).role = (user as any).role;
      return session;
    },
    async signIn({ user }) {
      // Allow only approved users to sign in
      // First user (admin) will be approved at creation time
      if ((user as any).approved === false) return false;
      return true;
    },
  },
};

