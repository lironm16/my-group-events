import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

async function doMemberAction(userId: string, action: 'promote' | 'demote' | 'remove') {
  'use server';
  await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/admin/members`, { method: 'POST', body: JSON.stringify({ userId, action }) });
}

async function getMembers(familyId: string) {
  return prisma.user.findMany({ where: { familyId }, select: { id: true, name: true, email: true, role: true } });
}

export default async function SettingsFamilyMembersPage() {
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
  const members = await getMembers(me.familyId);

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול חברים</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
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
    </main>
  );
}
