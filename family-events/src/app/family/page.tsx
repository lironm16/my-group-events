import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import CopyButton from '@/components/CopyButton';

export default async function FamilyPage({ searchParams }: { searchParams?: { code?: string; groupId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page space-y-4">
        <h1 className="text-2xl font-bold">קבוצה</h1>
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לנהל קבוצה.</p>
      </main>
    );
  }
  let user = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: { include: { members: true, groups: true } }, group: true } });
  const code = searchParams?.code;
  const groupId = searchParams?.groupId;
  if (!user?.family && code) {
    const family = await prisma.family.findUnique({ where: { inviteCode: code } });
    if (family) {
      await prisma.user.update({ where: { id: user!.id }, data: { familyId: family.id, groupId: groupId ?? undefined } });
      redirect('/family');
    }
  }
  let family = user?.family ?? null;

  if (!family) {
    // Offer join by code
    return (
      <main className="container-page space-y-4 max-w-xl">
        <h1 className="text-2xl font-bold">קבוצה</h1>
        <JoinForm />
      </main>
    );
  }

  const base = process.env.NEXTAUTH_URL ?? '';
  const inviteUrl = `${base}/family?code=${encodeURIComponent(family.inviteCode)}`;

  const needsGroup = !!family && !user?.groupId;
  return (
    <main className="container-page space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{family.name}</h1>
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">קוד הזמנה</div>
            <div className="font-mono text-lg">{family.inviteCode}</div>
          </div>
          <CopyButton value={inviteUrl} />
        </div>
        <div>
          <h2 className="font-semibold mb-2">חברי קבוצה</h2>
          <ul className="space-y-1">
            {family.members.map((m) => (
              <li key={m.id} className="text-sm text-gray-700 dark:text-gray-300">{m.name ?? m.email ?? m.id}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">תתי-קבוצות</h2>
          {family.groups.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">אין קבוצות עדיין. ניתן ליצור קבוצה חדשה ב-&apos;הגדרות&apos;.</p>
          ) : (
            <ul className="space-y-1">
              {family.groups.map((g) => {
                const link = `${base}/family?code=${encodeURIComponent(family.inviteCode)}&groupId=${g.id}`;
                return (
                  <li key={g.id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 gap-2">
                    <span>{g.nickname}</span>
                    <CopyButton value={link} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {needsGroup && (
          <div className="rounded border border-blue-200 dark:border-blue-900 p-3 bg-blue-50/50 dark:bg-blue-900/20">
            <div className="mb-2 font-medium">לא שויכת לקבוצה</div>
            <div className="text-sm">גשו ל-&apos;הגדרות&apos; כדי לבחור קבוצה קיימת או ליצור אחת חדשה.</div>
          </div>
        )}
      </div>
    </main>
  );
}

// CopyButton moved to client component

function JoinForm() {
  return (
    <form
      className="space-y-3"
      action={async (formData: FormData) => {
        'use server';
        const code = String(formData.get('code') ?? '');
        await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/family/join`, { method: 'POST', body: JSON.stringify({ code }) });
      }}
    >
      <p className="text-gray-600 dark:text-gray-300">אין לכם משפחה עדיין? הצטרפו עם קוד הזמנה:</p>
      <input name="code" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="קוד הזמנה" />
      <button className="px-3 py-2 bg-blue-600 text-white rounded">הצטרפות</button>
    </form>
  );
}

