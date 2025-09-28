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
        const username = (credentials?.username as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;
        // Allow login by username or nickname only (no email)
        const user = await prisma.user.findFirst({ where: { OR: [ { username }, { name: username } ] } });
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
      // Allow only approved users to sign in
      // First user (admin) will be approved at creation time
      if ((user as any).approved === false) return false;
      return true;
    },
  },
};

