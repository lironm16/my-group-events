import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ThemeProvider from '@/components/ThemeProvider';
import AuthProvider from '@/components/AuthProvider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export const metadata: Metadata = {
  title: 'אירועי משפחת מתתיהו',
  description: 'ניהול אירועים למשפחת מתתיהו',
  icons: { icon: '/templates/party.jpg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider session={session}>
            <Nav />
            <div className="max-w-6xl mx-auto px-4">
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

