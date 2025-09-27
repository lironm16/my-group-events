export { default as middleware } from 'next-auth/middleware';
export const authConfig = { pages: { signIn: '/signin' } };

export const config = {
  matcher: ['/events/:path*', '/family/:path*'],
};

