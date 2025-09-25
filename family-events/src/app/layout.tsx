import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'אירועי משפחה',
  description: 'ניהול אירועים משפחתיים וחגים',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}

