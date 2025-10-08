import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ThemeProvider from '@/components/ThemeProvider';
import AuthProvider from '@/components/AuthProvider';
import AuthLoading from '@/components/AuthLoading';

export const metadata: Metadata = {
  title: 'אירועי משפחת מתתיהו',
  description: 'ניהול אירועים למשפחת מתתיהו',
  icons: { icon: '/templates/party.jpg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Nav />
          </AuthProvider>
        </ThemeProvider>
        <div className="max-w-6xl mx-auto px-4">
          {children}
        </div>
      </body>
    </html>
  );
}

