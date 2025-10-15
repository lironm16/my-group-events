import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import CopyButton from '@/components/CopyButton';
import InviteShare from '@/components/InviteShare';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export default async function SettingsFamilyInvitePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true, group: true } });
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

  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const base = (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim()) ? process.env.NEXTAUTH_URL : (host ? `${proto}://${host}` : '');
  const url = me.family?.inviteCode && base ? `${base}/signup?code=${encodeURIComponent(me.family.inviteCode)}` : '';

  async function regenerate() {
    'use server';
    await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/family/invite`, { method: 'POST' });
    revalidatePath('/settings/family/invite');
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">קישור הזמנה</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <div className="space-y-3">
        <div>
          <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" value={url || '— אין קישור עדיין —'} readOnly />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={regenerate}><button className="px-3 py-2 border rounded">צור קישור חדש</button></form>
          <CopyButton value={url || ''} label="העתק" />
          {url && (
            <InviteShare familyName={me.group?.nickname || me.family?.name || ''} shareUrl={url} />
          )}
        </div>
        <div className="text-xs text-gray-500">שתפו את הקישור כדי לאפשר הרשמה ללא הזנת קוד ידנית.</div>
      </div>
    </main>
  );
}
