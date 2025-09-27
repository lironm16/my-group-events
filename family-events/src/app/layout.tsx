import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'אירועי משפחה',
  description: 'ניהול אירועים משפחתיים וחגים',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Nav />
          <div className="max-w-6xl mx-auto px-4">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

