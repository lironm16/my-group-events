import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function OnboardingGroupPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי להמשיך.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true } });
  if (!me?.approved) {
    return (
      <main className="container-page max-w-xl">
        <p className="text-gray-600 dark:text-gray-300">הבקשה ממתינה לאישור מנהל.</p>
      </main>
    );
  }
  if (!me.familyId) {
    return (
      <main className="container-page max-w-xl">
        <h1 className="text-2xl font-bold">בחירת קבוצה</h1>
        <p className="text-gray-600 dark:text-gray-300">עדיין לא שויכת למשפחה. לאחר שמנהל ישייך אותך למשפחה תוכל לבחור או ליצור קבוצה.</p>
      </main>
    );
  }
  const groups = await prisma.group.findMany({ where: { familyId: me.familyId }, orderBy: { createdAt: 'asc' } });

  async function setGroup(formData: FormData) {
    'use server';
    const groupId = String(formData.get('groupId') || '');
    if (!groupId) return;
    await prisma.user.update({ where: { id: me.id }, data: { groupId } });
  }

  async function createGroup(formData: FormData) {
    'use server';
    const nickname = String(formData.get('nickname') || '').trim();
    if (!nickname) return;
    const exists = await prisma.group.findFirst({ where: { familyId: me.familyId!, nickname } });
    if (exists) return;
    const g = await prisma.group.create({ data: { nickname, familyId: me.familyId! } });
    await prisma.user.update({ where: { id: me.id }, data: { groupId: g.id } });
  }

  return (
    <main className="container-page space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">בחירת קבוצה</h1>
      <div className="space-y-2">
        <h2 className="font-semibold">בחרו קבוצה קיימת</h2>
        {groups.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">אין קבוצות עדיין.</p>
        ) : (
          <form action={setGroup} className="flex items-center gap-2">
            <select name="groupId" defaultValue="" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <option value="">— לבחור קבוצה —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.nickname}</option>
              ))}
            </select>
            <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
          </form>
        )}
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold">או יצירת קבוצה חדשה</h2>
        <form action={createGroup} className="flex items-center gap-2">
          <input name="nickname" placeholder="שם קבוצה" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
          <button className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">יצירה ושיוך</button>
        </form>
      </div>
    </main>
  );
}

