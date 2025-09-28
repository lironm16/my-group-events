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
  if (!(me as any)?.approved) {
    return (
      <main className="container-page max-w-xl">
        <p className="text-gray-600 dark:text-gray-300">הבקשה ממתינה לאישור מנהל.</p>
      </main>
    );
  }
  if (!me?.familyId) {
    return (
      <main className="container-page max-w-xl">
        <h1 className="text-2xl font-bold">בחירת קבוצה</h1>
        <p className="text-gray-600 dark:text-gray-300">עדיין לא שויכת למשפחה. לאחר שמנהל ישייך אותך למשפחה תוכל לבחור או ליצור קבוצה.</p>
      </main>
    );
  }
  const groups = await prisma.group.findMany({
    where: { familyId: me.familyId },
    orderBy: { createdAt: 'asc' },
    include: { members: { select: { id: true, name: true, username: true, image: true } } },
  });

  async function setGroup(formData: FormData) {
    'use server';
    if (!me) return;
    const groupId = String(formData.get('groupId') || '');
    if (!groupId) return;
    await prisma.user.update({ where: { id: me.id }, data: { groupId } });
  }

  async function createGroup(formData: FormData) {
    'use server';
    if (!me?.familyId) return;
    const nickname = String(formData.get('nickname') || '').trim();
    if (!nickname) return;
    const exists = await prisma.group.findFirst({ where: { familyId: me.familyId, nickname } });
    if (exists) return;
    const g = await prisma.group.create({ data: { nickname, familyId: me.familyId } });
    await prisma.user.update({ where: { id: me.id }, data: { groupId: g.id } });
  }

  return (
    <main className="container-page space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">בחירת קבוצה</h1>
      <div className="space-y-2">
        <h2 className="font-semibold">בחרו קבוצה קיימת</h2>
        {groups.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">אין קבוצות עדיין.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <form key={g.id} action={setGroup} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
                <input type="hidden" name="groupId" value={g.id} />
                <div className="flex flex-col items-center text-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(g.nickname)}`}
                    alt={g.nickname}
                    className="w-24 h-24"
                  />
                  <div className="font-medium">{g.nickname}</div>
                  {g.members.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      {g.members.slice(0, 6).map((m) => (
                        <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.image && m.image.startsWith('http') ? m.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(m.username || m.name || 'user')}`}
                            alt={m.name || m.username || ''}
                            className="w-4 h-4"
                          />
                          <span>{m.name || m.username}</span>
                        </span>
                      ))}
                      {g.members.length > 6 && (
                        <span className="text-xs text-gray-500">+{g.members.length - 6}</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">אין חברים בקבוצה</div>
                  )}
                  <button className="mt-2 px-3 py-2 bg-blue-600 text-white rounded w-full">בחירה</button>
                </div>
              </form>
            ))}
          </div>
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

