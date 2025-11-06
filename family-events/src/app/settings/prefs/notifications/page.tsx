import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DirtySubmit from '@/components/DirtySubmit';
import { revalidatePath } from 'next/cache';
import TestPushButton from '@/components/TestPushButton';

export default async function SettingsPrefsNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });

  async function update(fd: FormData) {
    'use server';
    const on = String(fd.get('on') ?? 'off') === 'on';
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.email) return;
    const meInner = await prisma.user.findFirst({ where: { email: sessionInner.user.email } });
    if (!meInner) return;
    await prisma.user.update({ where: { id: meInner.id }, data: { notifyRsvpEmails: on } });
    revalidatePath('/settings/prefs/notifications');
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">התראות RSVP</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <form className="space-y-2" action={update}>
        <label className="inline-flex items-center gap-2">
          <input name="on" type="checkbox" defaultChecked={Boolean((me as any)?.notifyRsvpEmails)} />
          <span>קבל מייל כשיש שינוי באישורי הגעה לאירועים שלי</span>
        </label>
        <div>
          <DirtySubmit names={["on"]} initial={{ on: Boolean((me as any)?.notifyRsvpEmails) ? 'on' : '' }} />
        </div>
        </form>
        <section className="space-y-3 border-t pt-4">
          <div>
            <h2 className="text-xl font-semibold">בדיקת התראות Push</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              לוודא שהתראות עובדות במכשיר:
            </p>
            <ol className="list-decimal pr-5 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <li>בדפדפן תומך (כרום או ספארי 16.4+). ב-iOS יש לפתוח את האתר בספארי ולהוסיף למסך הבית.</li>
              <li>פתחו את האפליקציה מהמסך הבית ולחצו על הכפתור למטה כדי לאשר התראות.</li>
              <li>אם לא מתקבלת בקשה, בדקו <span className="font-semibold">הגדרות &gt; התראות</span> במכשיר ואפשרו התראות לאפליקציה.</li>
            </ol>
          </div>
          <TestPushButton />
        </section>
    </main>
  );
}
