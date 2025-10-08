import Link from 'next/link';
import EventsExplorer from '@/components/EventsExplorer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

type EventCard = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  host: { name: string | null };
  hostId: string | null;
  holidayKey?: string | null;
  rsvps: { status: string; userId?: string }[];
};

export default async function EventsPage({ searchParams }: { searchParams?: { page?: string } }) {
  const session = await getServerSession(authOptions);
  const authorized = !!session?.user?.email;
  const page = Number(searchParams?.page ?? '1') || 1;
  const pageSize = 12;
  let events: EventCard[] = [];
  let total = 0;
  let needsOnboarding = false;
  if (authorized) {
    const user = await prisma.user.findFirst({ where: { email: session!.user!.email as string } });
    if (user) {
      if (user.approved && user.familyId && !user.groupId) needsOnboarding = true;
      const where = { OR: [
        { hostId: user.id },
        { familyId: user.familyId ?? undefined, visibleToAll: true }
      ] } as any;
      total = await prisma.event.count({ where });
      const rows = await prisma.event.findMany({
        where,
        orderBy: { startAt: 'asc' },
        include: { rsvps: { select: { status: true, userId: true } }, host: { select: { name: true, id: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      events = rows.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        location: r.location,
        startAt: r.startAt.toISOString(),
        endAt: r.endAt ? r.endAt.toISOString() : null,
        host: { name: r.host?.name ?? null },
        hostId: r.host?.id ?? null,
        holidayKey: (r as any).holidayKey ?? null,
        rsvps: r.rsvps.map(x => ({ status: x.status, userId: x.userId })),
      }));
    }
  }
  return (
    <main className="container-page space-y-4">
      {needsOnboarding && (
        <div className="p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-900">
          לא בחרתם קבוצה עדיין. <Link className="underline" href="/onboarding/group">בחירת קבוצה</Link>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אירועים</h1>
        {authorized ? (
          <Link className="px-3 py-2 bg-blue-600 text-white rounded" href="/events/new">אירוע חדש</Link>
        ) : (
          <Link className="px-3 py-2 bg-blue-600 text-white rounded" href="/api/auth/signin">התחברות</Link>
        )}
      </div>
      {!authorized ? (
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לראות וליצור אירועים.</p>
      ) : events.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">אין אירועים להצגה כרגע.</p>
      ) : (
        <EventsExplorer initial={events} />
      )}
    </main>
  );
}

function Pagination({ total, pageSize, page }: { total: number; pageSize: number; page: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const items = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap gap-2 items-center justify-center mt-6">
      {items.map((p) => (
        <Link key={p} href={`/events?page=${p}`} className={[
          'px-3 py-1 rounded border text-sm',
          p === page ? 'bg-blue-600 text-white border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
        ].join(' ')}>
          {p}
        </Link>
      ))}
    </div>
  );
}


