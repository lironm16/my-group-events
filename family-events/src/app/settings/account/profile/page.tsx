import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import AvataaarsEditor from '@/components/AvataaarsEditor';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function SettingsAccountProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-xl" dir="rtl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לשנות הגדרות.</p>
      </main>
    );
  }
  const user = await prisma.user.findFirst({ where: { email: session.user.email } });
  const current = { name: user?.name ?? '', email: user?.email ?? '', image: (user?.image as string) ?? '' };

  async function update(fd: FormData) {
    'use server';
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.email) return;
    const me = await prisma.user.findFirst({ where: { email: sessionInner.user.email } });
    if (!me) return;
    const name = String(fd.get('name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const image = String(fd.get('image') ?? '').trim();
    if (email) {
      const conflict = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } as any, NOT: { id: me.id } as any } as any });
      if (conflict) return;
    }
    await prisma.user.update({ where: { id: me.id }, data: { name: name || null, email: email || null, image: image || null } });
    revalidatePath('/settings/account/profile');
  }

  return (
    <main className="container-page space-y-6 max-w-xl text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">פרופיל</h1>
        <Link className="px-3 py-2 rounded border" href="/settings">חזרה להגדרות</Link>
      </div>
      <form className="space-y-2" action={update}>
        <input name="name" defaultValue={current.name} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="שם תצוגה" />
        <input name="email" defaultValue={current.email} className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="אימייל" />
        <div className="pt-2 border-t space-y-2">
          <div className="text-sm text-gray-600">אווטאר</div>
          <AvataaarsEditor defaultValue={current.image} name="image" showExternalLink />
        </div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
      </form>
    </main>
  );
}
