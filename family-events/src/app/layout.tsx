import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ThemeProvider from '@/components/ThemeProvider';
import AuthProvider from '@/components/AuthProvider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import Script from 'next/script';
import PushNotificationsInitializer from '@/components/PushNotificationsInitializer';

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
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
            try {
              var stored = localStorage.getItem('theme');
              var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var theme = stored ? stored : (prefersDark ? 'dark' : 'light');
              if (theme === 'dark') document.documentElement.classList.add('dark');
              else document.documentElement.classList.remove('dark');
              // Persist a data attribute to help CSS avoid flashes
              document.documentElement.setAttribute('data-theme', theme);
            } catch(e) {}
            })();`}
          </Script>
          <ThemeProvider>
            <AuthProvider session={session}>
              <PushNotificationsInitializer />
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

