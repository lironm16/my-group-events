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

  async function save(fd: FormData) {
    'use server';
    const mode = String(fd.get('mode') ?? 'select');
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.email) return;
    const meInner = await prisma.user.findFirst({ where: { email: sessionInner.user.email } });
    if (!meInner?.familyId) return;
    if (mode === 'create') {
      const nickname = String(fd.get('nickname') ?? '').trim();
      if (!nickname) return;
      const group = await prisma.group.create({ data: { nickname, familyId: meInner.familyId } });
      await prisma.user.update({ where: { id: meInner.id }, data: { groupId: group.id } });
    } else {
      const groupId = String(fd.get('groupId') ?? '');
      if (groupId) await prisma.user.update({ where: { id: meInner.id }, data: { groupId } });
    }
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">בחירת קבוצה</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <div className="space-y-3">
        <form className="space-y-3" action={save}>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="mode" value="select" defaultChecked />
              <span>בחירת קבוצה קיימת</span>
            </label>
            <select name="groupId" defaultValue={me.group?.id ?? ''} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <option value="">— לבחור קבוצה —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.nickname}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="mode" value="create" />
              <span>יצירת קבוצה/תת־קבוצה חדשה</span>
            </label>
            <input name="nickname" placeholder="כינוי לקבוצה/תת־קבוצה" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
          </div>
          <DirtySubmit names={["mode","groupId","nickname"]} initial={{ mode: 'select', groupId: me.group?.id ?? '', nickname: '' }} />
        </form>
      </div>
    </main>
  );
}
