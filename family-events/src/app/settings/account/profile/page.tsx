import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import AvataaarsEditor from '@/components/AvataaarsEditor';
import DirtySubmit from '@/components/DirtySubmit';
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
    const user = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true, name: true, email: true, image: true, gender: true } });
    const current = { name: user?.name ?? '', email: user?.email ?? '', image: (user?.image as string) ?? '', gender: user?.gender ?? 'unspecified' };

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
      const gender = String(fd.get('gender') ?? '').trim();
      const allowedGender = ['male', 'female', 'unspecified'];
      const genderValue = allowedGender.includes(gender) ? gender : 'unspecified';
      await prisma.user.update({ where: { id: me.id }, data: { name: name || null, email: email || null, image: image || null, gender: genderValue } });
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
          <fieldset className="border rounded p-3 space-y-2">
            <legend className="px-2 text-sm font-medium">איך תרצו שיפנו אליכם?</legend>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'female', label: 'אני אישה' },
                { value: 'male', label: 'אני גבר' },
                { value: 'unspecified', label: 'לא משנה / אחר' },
              ].map(opt => (
                <label key={opt.value} className={`inline-flex items-center gap-2 px-3 py-2 rounded border text-sm ${current.gender === opt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'border-gray-200 dark:border-gray-700'}`}>
                  <input type="radio" name="gender" value={opt.value} defaultChecked={current.gender === opt.value} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        <div className="pt-2 border-t space-y-2">
          <div className="text-sm text-gray-600">אווטאר</div>
          <AvataaarsEditor defaultValue={current.image} name="image" showExternalLink />
        </div>
          <DirtySubmit names={["name","email","image","gender"]} initial={{ name: current.name, email: current.email, image: current.image, gender: current.gender }} updateSessionFields={["name","email","image","gender"]} />
      </form>
    </main>
  );
}
