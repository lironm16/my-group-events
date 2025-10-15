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
  let user = await prisma.user.findFirst({ where: { email: session.user.email }, include: { family: true, group: true } });
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

  // Load sub-groups (top-level groups) and their members (no buttons/actions)
  const subGroups = await prisma.group.findMany({
    where: { familyId: family.id, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: { members: { select: { id: true, name: true, email: true, image: true } } },
  });

  return (
    <main className="container-page space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{family.name}</h1>
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 space-y-6">
        {subGroups.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">אין תתי-קבוצות עדיין.</p>
        ) : (
          <ul className="space-y-5">
            {subGroups.map((g) => (
              <li key={g.id} className="space-y-2">
                <div className="font-semibold">{g.nickname}</div>
                {g.members.length === 0 ? (
                  <div className="text-xs text-gray-500">אין חברים בקבוצה זו</div>
                ) : (
                  <ul className="flex flex-wrap gap-3">
                    {g.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(() => {
                            const img = (m as any).image as string | null;
                            if (img && /^https?:/i.test(img)) return img;
                            const seed = encodeURIComponent((m as any).name || (m as any).email || 'member');
                            return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`;
                          })()}
                          alt={(m as any).name || ''}
                          className="w-6 h-6 rounded-full border"
                        />
                        <span>{(m as any).name || (m as any).email || m.id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
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

