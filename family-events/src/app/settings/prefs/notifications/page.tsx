import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

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
    if (!me) return;
    await prisma.user.update({ where: { id: me.id }, data: { notifyRsvpEmails: on } });
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
          <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
        </div>
      </form>
    </main>
  );
}
