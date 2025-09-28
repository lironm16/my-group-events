import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/signin' },
  callbacks: {
    authorized: ({ req, token }) => {
      const pathname = req.nextUrl.pathname;
      // Temporarily allow unauthenticated access to key pages during setup
      if (['/events', '/events/new', '/settings'].includes(pathname)) return true;
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/events/:path*', '/family/:path*'],
};

