import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { headers } from 'next/headers';
import { buildUserIcsTokenFromDb } from '@/lib/ics';
import CopyButton from '@/components/CopyButton';

export default async function SettingsCalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <div className="space-y-2">
          <p className="text-gray-600 dark:text-gray-300">בעיה בטעינת המשתמש.</p>
          <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
        </div>
      </main>
    );
  }

  const token = await buildUserIcsTokenFromDb(me.id);
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const base = (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim()) ? process.env.NEXTAUTH_URL : (host ? `${proto}://${host}` : '');
  const url = token && base ? `${base}/api/users/ics?token=${encodeURIComponent(token)}` : '';

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לוח שנה</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">סנכרון ללוח שנה בטלפון</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          הוסיפו את הקישור הבא ללוח השנה במכשיר שלכם (כמו Google Calendar או Apple Calendar) כדי לראות את כל האירועים שאתם מארחים, הוזמנתם אליהם, ואלו הפתוחים במשפחות שלכם.
        </p>
        <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" value={url || '— אין קישור —'} readOnly />
        <div className="flex gap-2">
          <CopyButton value={url || ''} label="העתק" />
          <a className="px-3 py-2 rounded border" href={url}>
            פתיחה
          </a>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p>ב-Apple Calendar: Calendar &gt; File &gt; New Calendar Subscription והדביקו את הכתובת.</p>
          <p>ב-Google Calendar: הגדרות &gt; הוספת לוח שנה &gt; מכתובת URL והדביקו את הכתובת.</p>
        </div>
      </section>
    </main>
  );
}
