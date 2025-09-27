import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: { signIn: '/signin' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: { email: { label: 'Email', type: 'email' } },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase();
        if (!email) return null;
        const user = await prisma.user.upsert({
          where: { email },
          create: { email, name: email.split('@')[0] },
          update: {},
        });
        return user;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach user.id to session for server components usage
      (session.user as any).id = user.id;
      return session;
    },
  },
};

