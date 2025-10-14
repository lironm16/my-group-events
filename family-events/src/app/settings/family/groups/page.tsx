import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DirtySubmit from '@/components/DirtySubmit';

export default async function SettingsFamilyGroupsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true, group: true } });
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

  const groups = await prisma.group.findMany({ where: { familyId: me.familyId }, orderBy: { createdAt: 'asc' } });

  async function select(fd: FormData) {
    'use server';
    const groupId = String(fd.get('groupId') ?? '');
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.email) return;
    const meInner = await prisma.user.findFirst({ where: { email: sessionInner.user.email } });
    if (!meInner) return;
    if (groupId) await prisma.user.update({ where: { id: meInner.id }, data: { groupId } });
  }

  async function create(fd: FormData) {
    'use server';
    const nickname = String(fd.get('nickname') ?? '').trim();
    if (!nickname) return;
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.email) return;
    const meInner = await prisma.user.findFirst({ where: { email: sessionInner.user.email } });
    if (!meInner?.familyId) return;
    const group = await prisma.group.create({ data: { nickname, familyId: meInner.familyId } });
    await prisma.user.update({ where: { id: meInner.id }, data: { groupId: group.id } });
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">קבוצה</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <div className="space-y-2">
        <form className="space-y-2" action={select}>
          <select name="groupId" defaultValue={me.group?.id ?? ''} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <option value="">— לבחור קבוצה —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.nickname}</option>
            ))}
          </select>
          <DirtySubmit names={["groupId"]} initial={{ groupId: me.group?.id ?? '' }} />
        </form>
        <div className="text-sm text-gray-500">או צור קבוצה חדשה:</div>
        <form className="space-y-2" action={create}>
          <input name="nickname" placeholder="כינוי לקבוצה" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
          <DirtySubmit names={["nickname"]} initial={{ nickname: '' }} />
        </form>
      </div>
    </main>
  );
}
