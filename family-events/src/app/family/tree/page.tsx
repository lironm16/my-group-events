import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import GroupTree, { GroupNode } from '@/components/GroupTree';

export default async function FamilyTreePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page max-w-4xl">
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לראות את עץ המשפחה.</p>
      </main>
    );
  }
  const me = await prisma.user.findFirst({ where: { email: session.user.email } });
  if (!me?.familyId) {
    return (
      <main className="container-page max-w-4xl">
        <p className="text-gray-600 dark:text-gray-300">עדיין לא שויכת למשפחה.</p>
      </main>
    );
  }
  const groups = await prisma.group.findMany({
    where: { familyId: me.familyId },
    orderBy: { createdAt: 'asc' },
    include: { members: { select: { id: true, name: true } } },
  });
  const nodes: GroupNode[] = groups.map(g => ({ id: g.id, nickname: g.nickname, parentId: (g as any).parentId ?? null, members: g.members }));
  return (
    <main className="container-page max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">עץ המשפחה</h1>
      <GroupTree groups={nodes} />
    </main>
  );
}

