import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import AvatarPicker from '@/components/AvatarPicker';

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
      <ProfileForm userId={user!.id} current={{ name: user?.name ?? '', email: user?.email ?? '', image: user?.image ?? '' }} />
      <PasswordForm userId={user!.id} />
      <FamilyNameForm familyId={user?.family?.id ?? null} name={user?.family?.name ?? ''} isAdmin={user?.role === 'admin'} />
      <AdminMembers familyId={user?.family?.id ?? null} isAdmin={user?.role === 'admin'} />
      <GroupForm userId={user!.id} currentGroupId={user?.group?.id ?? null} groups={groups} />
    </main>
  );
}

function FamilyNameForm({ familyId, name, isAdmin }: { familyId: string | null; name: string; isAdmin: boolean }) {
  if (!familyId) return null;
  if (!isAdmin) return (
    <div>
      <label className="block text-sm text-gray-600">שם המשפחה</label>
      <div className="mt-1">{name}</div>
    </div>
  );
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

async function doMemberAction(userId: string, action: 'promote' | 'demote' | 'remove') {
  'use server';
  await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/admin/members`, { method: 'POST', body: JSON.stringify({ userId, action }) });
}

async function regenerateInvite() {
  'use server';
  await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/family/invite`, { method: 'POST' });
}

async function getMembers(familyId: string) {
  return prisma.user.findMany({ where: { familyId }, select: { id: true, name: true, email: true, role: true } });
}

async function AdminMembers({ familyId, isAdmin }: { familyId: string | null; isAdmin: boolean }) {
  if (!familyId || !isAdmin) return null;
  const members = await getMembers(familyId);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">ניהול חברים</h2>
        <form action={regenerateInvite}>
          <button className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">יצירת קוד הזמנה חדש</button>
        </form>
      </div>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm">
            <span>{m.name ?? m.email ?? m.id} · {m.role}</span>
            <div className="flex gap-2">
              {m.role !== 'admin' ? (
                <form action={async () => doMemberAction(m.id, 'promote')}><button className="px-2 py-1 border rounded">הפוך למנהל</button></form>
              ) : (
                <form action={async () => doMemberAction(m.id, 'demote')}><button className="px-2 py-1 border rounded">הפוך לחבר</button></form>
              )}
              <form action={async () => doMemberAction(m.id, 'remove')}><button className="px-2 py-1 border rounded">הסרה</button></form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileForm({ userId, current }: { userId: string; current: { name: string; email: string; image: string } }) {
  return (
    <form
      className="space-y-2"
      action={async (fd: FormData) => {
        'use server';
        const name = String(fd.get('name') ?? '').trim();
        const email = String(fd.get('email') ?? '').trim().toLowerCase();
        const image = String(fd.get('image') ?? '').trim();
        await prisma.user.update({ where: { id: userId }, data: { name: name || null, email: email || null, image: image || null } });
      }}
    >
      <h2 className="font-semibold">פרופיל</h2>
      <input name="name" defaultValue={current.name} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="שם תצוגה" />
      <input name="email" defaultValue={current.email} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="אימייל" />
      <div className="flex items-center gap-2">
        <input name="image" defaultValue={current.image} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="קישור לתמונה" />
        <label className="px-3 py-2 border rounded cursor-pointer">
          העלאה
          <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
            const f = (e.target as HTMLInputElement).files?.[0];
            if (!f) return;
            const form = new FormData();
            form.append('file', f);
            const res = await fetch('/api/upload', { method: 'POST', body: form });
            const j = await res.json();
            if (j.url) {
              (e.currentTarget.form as HTMLFormElement).image.value = j.url;
            }
          }} />
        </label>
      </div>
      <div className="pt-2 border-t">
        <div className="text-sm text-gray-600 mb-1">או לבחור מכל גלריית DiceBear</div>
        <AvatarPicker onChange={({ url }) => { (document.querySelector('input[name="image"]') as HTMLInputElement).value = url; }} />
      </div>
      <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
    </form>
  );
}

function PasswordForm({ userId }: { userId: string }) {
  return (
    <form
      className="space-y-2"
      action={async (fd: FormData) => {
        'use server';
        const password = String(fd.get('password') ?? '');
        if (!password) return;
        const bcrypt = (await import('bcryptjs')).default;
        const hash = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
      }}
    >
      <h2 className="font-semibold">החלפת סיסמה</h2>
      <input name="password" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="סיסמה חדשה" type="password" />
      <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
    </form>
  );
}

