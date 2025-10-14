import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function SettingsFamilyNewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });

  async function create(fd: FormData) {
    'use server';
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.email) return;
    const meInner = await prisma.user.findFirst({ where: { email: sessionInner.user.email } });
    if (!meInner) return;
    const name = String(fd.get('name') ?? '').trim() || 'משפחה חדשה';
    function generateCode(length = 8) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let res = '';
      for (let i = 0; i < length; i++) res += chars[Math.floor(Math.random() * chars.length)];
      return res;
    }
    let code = generateCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.family.findUnique({ where: { inviteCode: code } }).catch(() => null);
      if (!exists) break;
      code = generateCode();
    }
    const family = await prisma.family.create({ data: { name, inviteCode: code } });
    await prisma.user.update({ where: { id: meInner.id }, data: { familyId: family.id, groupId: null } });
    revalidatePath('/settings/family/new');
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">יצירת משפחה חדשה</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <form className="space-y-2" action={create}>
        <input name="name" placeholder="שם המשפחה" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
        <button className="px-3 py-2 bg-green-600 text-white rounded">יצירה והחלפת הקשר</button>
        <div className="text-xs text-gray-500">ניצור משפחה חדשה ונעביר את ההקשר הפעיל אליה. תוכלו להמשיך לבחור תת־קבוצה בתוך המשפחה החדשה.</div>
      </form>
    </main>
  );
}
