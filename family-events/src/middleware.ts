import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/signin' },
  callbacks: {
    authorized: ({ req, token }) => {
      const pathname = req.nextUrl.pathname;
      // Allow unauthenticated access to the event creation page
      if (pathname === '/events/new') return true;
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/events/:path*', '/family/:path*'],
};

