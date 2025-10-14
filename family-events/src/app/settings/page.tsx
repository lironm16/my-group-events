import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import AvataaarsEditor from '@/components/AvataaarsEditor';
import CopyButton from '@/components/CopyButton';
import FormSubmit from '@/components/FormSubmit';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
// Theme toggles use a pure server form here to avoid client boundaries

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const user = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true, group: true } });
  const groups = user?.familyId ? await prisma.group.findMany({ where: { familyId: user.familyId }, orderBy: { createdAt: 'asc' } }) : [];
  return (
    <main className="container-page space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">הגדרות</h1>
      <Approvals familyId={user?.family?.id ?? null} isAdmin={user?.role === 'admin'} />
      <InvitePanel familyId={user?.family?.id ?? null} isAdmin={user?.role === 'admin'} inviteCode={user?.family?.inviteCode ?? null} />
      <CreateNewFamilyForm userId={user!.id} />
      <ThemeSelectForm userId={user!.id} current={(user as any)?.theme as string | undefined} />
      <DefaultLocationForm userId={user!.id} current={(user as any)?.defaultLocation as string | undefined} />
      <NotifyRsvpForm userId={user!.id} current={Boolean((user as any)?.notifyRsvpEmails)} />
      <ProfileForm userId={user!.id} current={{ name: user?.name ?? '', email: user?.email ?? '', image: user?.image ?? '' }} />
      <PasswordForm userId={user!.id} />
      <FamilyNameForm familyId={user?.family?.id ?? null} name={user?.family?.name ?? ''} isAdmin={user?.role === 'admin'} />
      <AdminMembers familyId={user?.family?.id ?? null} isAdmin={user?.role === 'admin'} />
      <GroupForm userId={user!.id} currentGroupId={user?.group?.id ?? null} groups={groups} />
    </main>
  );
}

function CreateNewFamilyForm({ userId }: { userId: string }) {
  async function create(fd: FormData) {
    'use server';
    const name = String(fd.get('name') ?? '').trim() || 'משפחה חדשה';
    function generateCode(length = 8) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let res = '';
      for (let i = 0; i < length; i++) res += chars[Math.floor(Math.random() * chars.length)];
      return res;
    }
    // create unique invite code
    let code = generateCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.family.findUnique({ where: { inviteCode: code } }).catch(() => null);
      if (!exists) break;
      code = generateCode();
    }
    const family = await prisma.family.create({ data: { name, inviteCode: code } });
    await prisma.user.update({ where: { id: userId }, data: { familyId: family.id, groupId: null } });
    // refresh settings
    revalidatePath('/settings');
  }
  return (
    <form className="space-y-2" action={create}>
      <h2 className="font-semibold">יצירת משפחה ראשית חדשה</h2>
      <input name="name" placeholder="שם המשפחה" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
      <button className="px-3 py-2 bg-green-600 text-white rounded">יצירה והחלפת הקשר</button>
      <div className="text-xs text-gray-500">ניצור משפחה חדשה ונעביר את ההקשר הפעיל אליה. תוכלו להמשיך לבחור תת־קבוצה בתוך המשפחה החדשה.</div>
    </form>
  );
}
async function InvitePanel({ familyId, isAdmin, inviteCode }: { familyId: string | null; isAdmin: boolean; inviteCode: string | null }) {
  if (!isAdmin) return null;
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const base = (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim()) ? process.env.NEXTAUTH_URL : (host ? `${proto}://${host}` : '');
  const url = inviteCode && base ? `${base}/signup?code=${encodeURIComponent(inviteCode)}` : '';
  async function regenerate() {
    'use server';
    await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/family/invite`, { method: 'POST' });
    revalidatePath('/settings');
  }
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">קישור הזמנה</h2>
      <div className="flex items-center gap-2">
        <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" defaultValue={url || '— אין קישור עדיין —'} readOnly />
        <form action={regenerate}><FormSubmit>צור קישור חדש</FormSubmit></form>
        <CopyButton value={url || ''} label="העתק" />
      </div>
      <div className="text-xs text-gray-500">שתפו את הקישור כדי לאפשר הרשמה ללא הזנת קוד ידנית.</div>
    </div>
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
    <div className="space-y-2">
      <label className="block text-sm text-gray-600">קבוצה</label>
      <form className="space-y-2" action={async (fd: FormData) => {
        'use server';
        const groupId = String(fd.get('groupId') ?? '');
        if (groupId) await prisma.user.update({ where: { id: userId }, data: { groupId } });
      }}>
        <select name="groupId" defaultValue={currentGroupId ?? ''} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <option value="">— לבחור קבוצה —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.nickname}</option>
          ))}
        </select>
        <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירת בחירה</button>
      </form>
      <div className="text-sm text-gray-500">או צור קבוצה חדשה:</div>
      <form className="space-y-2" action={async (fd: FormData) => {
        'use server';
        const nickname = String(fd.get('nickname') ?? '').trim();
        if (!nickname) return;
        const me = await prisma.user.findUnique({ where: { id: userId } });
        if (!me?.familyId) return;
        const group = await prisma.group.create({ data: { nickname, familyId: me.familyId } });
        await prisma.user.update({ where: { id: userId }, data: { groupId: group.id } });
      }}>
        <input name="nickname" placeholder="כינוי לקבוצה" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
        <button className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">יצירת קבוצה ושיוך</button>
      </form>
    </div>
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

async function getApprovals() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/admin/approvals`, { cache: 'no-store' });
  if (!res.ok) return [] as { id: string; name: string | null; email: string | null; image: string | null }[];
  const j = await res.json();
  return j.users as { id: string; name: string | null; email: string | null; image: string | null }[];
}

async function Approvals({ familyId, isAdmin }: { familyId: string | null; isAdmin: boolean }) {
  if (!familyId || !isAdmin) return null;
  const users = await getApprovals();
  if (!users.length) return null;
  async function act(userId: string, action: 'approve' | 'deny') {
    'use server';
    await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/admin/approvals`, { method: 'POST', body: JSON.stringify({ userId, action }) });
  }
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">בקשות הצטרפות ממתינות</h2>
      <ul className="space-y-1">
        {users.map(u => (
          <li key={u.id} className="flex items-center justify-between text-sm">
            <span>{u.name ?? u.email ?? u.id}</span>
            <div className="flex gap-2">
              <form action={act.bind(null, u.id, 'approve')}><button className="px-2 py-1 border rounded">אישור</button></form>
              <form action={act.bind(null, u.id, 'deny')}><button className="px-2 py-1 border rounded">דחייה</button></form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
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
                <form action={doMemberAction.bind(null, m.id, 'promote')}><button className="px-2 py-1 border rounded">הפוך למנהל</button></form>
              ) : (
                <form action={doMemberAction.bind(null, m.id, 'demote')}><button className="px-2 py-1 border rounded">הפוך לחבר</button></form>
              )}
              <form action={doMemberAction.bind(null, m.id, 'remove')}><button className="px-2 py-1 border rounded">הסרה</button></form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThemeSelectForm({ userId, current }: { userId: string; current?: string }) {
  return (
    <form
      className="space-y-2"
      action={async (fd: FormData) => {
        'use server';
        const mode = String(fd.get('mode') ?? 'light');
        await prisma.user.update({ where: { id: userId }, data: { theme: mode } });
      }}
    >
      <h2 className="font-semibold">מצב תצוגה</h2>
      <select name="mode" defaultValue={current ?? 'light'} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <option value="light">בהיר</option>
        <option value="dark">כהה</option>
      </select>
      <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
    </form>
  );
}

// Theme toggles moved to client component ThemeModeSwitcher

function DefaultLocationForm({ userId, current }: { userId: string; current?: string }) {
  return (
    <form
      className="space-y-2"
      action={async (fd: FormData) => {
        'use server';
        const loc = String(fd.get('loc') ?? '').trim();
        await prisma.user.update({ where: { id: userId }, data: { defaultLocation: loc || null } });
      }}
    >
      <h2 className="font-semibold">מיקום ברירת מחדל לאירועים שאני מארח</h2>
      <input name="loc" defaultValue={current ?? ''} placeholder="למשל: הבית, חיפה, הפארק..." className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" />
      <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
    </form>
  );
}

function NotifyRsvpForm({ userId, current }: { userId: string; current: boolean }) {
  return (
    <form
      className="space-y-2"
      action={async (fd: FormData) => {
        'use server';
        const on = String(fd.get('on') ?? 'off') === 'on';
        await prisma.user.update({ where: { id: userId }, data: { notifyRsvpEmails: on } });
      }}
    >
      <h2 className="font-semibold">התראות אימייל על שינויים באישורי הגעה</h2>
      <label className="inline-flex items-center gap-2">
        <input name="on" type="checkbox" defaultChecked={current} />
        <span>קבל מייל כשיש שינוי באישורי הגעה לאירועים שלי</span>
      </label>
      <div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
      </div>
    </form>
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
        // Ensure email uniqueness if provided
        if (email) {
          const conflict = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } as any, NOT: { id: userId } as any } as any });
          if (conflict) {
            // Abort silently to avoid server error; UI does not handle errors here
            return;
          }
        }
        const updated = await prisma.user.update({ where: { id: userId }, data: { name: name || null, email: email || null, image: image || null } });
        try {
          const { getServerSession } = await import('next-auth');
          const { authOptions } = await import('@/auth');
          const session = await getServerSession(authOptions);
          if (session) {
            // Refresh JWT by updating token data on next request; best effort only
            // Client should re-fetch /api/users/me to update UI immediately
          }
        } catch {}
      }}
    >
      <h2 className="font-semibold">פרופיל</h2>
      <input name="name" defaultValue={current.name} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="שם תצוגה" />
      <input name="email" defaultValue={current.email} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="אימייל" />
      <div className="pt-2 border-t space-y-2">
        <div className="text-sm text-gray-600">אווטאר</div>
        <AvataaarsEditor defaultValue={current.image} name="image" showExternalLink />
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

