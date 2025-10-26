import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/signin' },
  callbacks: {
    authorized: ({ req, token }) => {
      const pathname = req.nextUrl.pathname;
      // Allow list for public pages only
      if (['/'].includes(pathname)) return true;
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/events/:path*', '/family/:path*', '/settings', '/signin'],
};

