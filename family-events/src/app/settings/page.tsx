import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { family: true, group: true } });
  const groups = user?.familyId ? await prisma.group.findMany({ where: { familyId: user.familyId }, orderBy: { createdAt: 'asc' } }) : [];
  return (
    <main className="container-page space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">הגדרות</h1>
      <FamilyNameForm familyId={user?.family?.id ?? null} name={user?.family?.name ?? ''} />
      <GroupForm userId={user!.id} currentGroupId={user?.group?.id ?? null} groups={groups} />
    </main>
  );
}

function FamilyNameForm({ familyId, name }: { familyId: string | null; name: string }) {
  if (!familyId) return null;
  return (
    <form
      className="space-y-2"
      action={async (fd: FormData) => {
        'use server';
        const newName = String(fd.get('name') ?? '').trim();
        if (!newName) return;
        await prisma.family.update({ where: { id: familyId }, data: { name: newName } });
      }}
    >
      <label className="block text-sm text-gray-600">שם המשפחה</label>
      <input name="name" defaultValue={name} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
      <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
    </form>
  );
}

function GroupForm({ userId, currentGroupId, groups }: { userId: string; currentGroupId: string | null; groups: { id: string; nickname: string }[] }) {
  return (
    <form
      className="space-y-2"
      action={async (fd: FormData) => {
        'use server';
        const kind = String(fd.get('kind') ?? 'select');
        if (kind === 'select') {
          const groupId = String(fd.get('groupId') ?? '');
          if (groupId) await prisma.user.update({ where: { id: userId }, data: { groupId } });
        } else {
          const nickname = String(fd.get('nickname') ?? '').trim();
          if (nickname) {
            const me = await prisma.user.findUnique({ where: { id: userId } });
            if (me?.familyId) {
              const group = await prisma.group.create({ data: { nickname, familyId: me.familyId } });
              await prisma.user.update({ where: { id: userId }, data: { groupId: group.id } });
            }
          }
        }
      }}
    >
      <label className="block text-sm text-gray-600">קבוצה</label>
      <div className="flex flex-col gap-2">
        <select name="groupId" defaultValue={currentGroupId ?? ''} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <option value="">— לבחור קבוצה —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.nickname}</option>
          ))}
        </select>
        <div className="text-sm text-gray-500">או צור קבוצה חדשה:</div>
        <input name="nickname" placeholder="כינוי לקבוצה" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
        <div className="flex gap-2">
          <input type="hidden" name="kind" value="select" />
          <button className="px-3 py-2 bg-blue-600 text-white rounded" formAction={undefined}>שמירת בחירה</button>
          <button className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" onClick={(e)=>{(e as any).currentTarget.form.kind.value='create';}} formAction={undefined}>יצירת קבוצה ושיוך</button>
        </div>
      </div>
    </form>
  );
}

