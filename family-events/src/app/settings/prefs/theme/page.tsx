import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DirtySubmit from '@/components/DirtySubmit';
import { revalidatePath } from 'next/cache';

export default async function SettingsPrefsThemePage() {
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
    const mode = String(fd.get('mode') ?? 'light');
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.email) return;
    const meInner = await prisma.user.findFirst({ where: { email: sessionInner.user.email } });
    if (!meInner) return;
    await prisma.user.update({ where: { id: meInner.id }, data: { theme: mode } });
    revalidatePath('/settings/prefs/theme');
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">מצב תצוגה</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <form className="space-y-2" action={update}>
        <select name="mode" defaultValue={(me as any)?.theme ?? 'light'} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <option value="light">בהיר</option>
          <option value="dark">כהה</option>
        </select>
        <DirtySubmit names={["mode"]} initial={{ mode: String((me as any)?.theme ?? 'light') }} />
      </form>
    </main>
  );
}
