import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function SettingsFamilyNamePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true } });
  if (!me?.familyId) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <div className="space-y-2">
          <p className="text-gray-600 dark:text-gray-300">אין משפחה פעילה.</p>
          <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
        </div>
      </main>
    );
  }
  const isAdmin = me.role === 'admin';
  if (!isAdmin) {
    return (
      <main className="container-page max-w-xl text-right" dir="rtl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">שם המשפחה</h1>
            <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
          </div>
          <div>{me.family?.name}</div>
        </div>
      </main>
    );
  }

  async function update(fd: FormData) {
    'use server';
    const name = String(fd.get('name') ?? '').trim();
    if (!name) return;
    await prisma.family.update({ where: { id: me.familyId! }, data: { name } });
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">שם המשפחה</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <form className="space-y-2" action={update}>
        <input name="name" defaultValue={me.family?.name ?? ''} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
        <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
      </form>
    </main>
  );
}
