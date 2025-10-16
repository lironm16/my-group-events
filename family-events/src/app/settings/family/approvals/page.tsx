import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

async function getApprovals() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/admin/approvals`, { cache: 'no-store' });
  if (!res.ok) return [] as { id: string; name: string | null; email: string | null; image: string | null }[];
  const j = await res.json();
  return j.users as { id: string; name: string | null; email: string | null; image: string | null }[];
}

export default async function SettingsFamilyApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me?.familyId || me.role !== 'admin') {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <div className="space-y-2">
          <p className="text-gray-600 dark:text-gray-300">אין הרשאה לצפות בעמוד זה.</p>
          <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
        </div>
      </main>
    );
  }
  const users = await getApprovals();

  async function act(userId: string, action: 'approve' | 'deny') {
    'use server';
    await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/admin/approvals`, { method: 'POST', body: JSON.stringify({ userId, action }) });
  }

  if (!users.length) {
    return (
      <main className="container-page max-w-xl text-right" dir="rtl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">בקשות הצטרפות</h1>
            <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
          </div>
          <p className="text-gray-600">אין בקשות ממתינות.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">בקשות הצטרפות ממתינות</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
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
    </main>
  );
}
