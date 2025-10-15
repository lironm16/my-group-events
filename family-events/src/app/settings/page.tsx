import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function SettingsIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const user = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true } });
  const isAdmin = user?.role === 'admin';
  const hasFamily = Boolean(user?.familyId);

  const Item = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <li>
      <Link className="block px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800" href={href}>{children}</Link>
    </li>
  );

  return (
    <main className="container-page space-y-8 max-w-xl text-right" dir="rtl">
      <h1 className="text-2xl font-bold">הגדרות</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">חשבון</h2>
        <ul className="space-y-2">
          <Item href="/settings/account/profile">פרופיל</Item>
          <Item href="/settings/account/password">החלפת סיסמה</Item>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">העדפות</h2>
        <ul className="space-y-2">
          <Item href="/settings/prefs/theme">מצב תצוגה</Item>
          <Item href="/settings/prefs/location">מיקום ברירת מחדל לאירועים</Item>
          <Item href="/settings/prefs/notifications">התראות אימייל על RSVP</Item>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">קבוצה</h2>
        <ul className="space-y-2">
          {hasFamily && <Item href="/settings/family/name">שם הקבוצה הראשית</Item>}
          {hasFamily && <Item href="/settings/family/groups">בחירת/יצירת קבוצה</Item>}
          {isAdmin && hasFamily && <Item href="/settings/family/invite">קישור הזמנה לקבוצה</Item>}
          {isAdmin && hasFamily && <Item href="/settings/family/members">ניהול חברי קבוצה</Item>}
          {isAdmin && hasFamily && <Item href="/settings/family/approvals">בקשות הצטרפות</Item>}
          <Item href="/settings/family/new">יצירת קבוצה ראשית חדשה</Item>
        </ul>
      </section>
    </main>
  );
}
