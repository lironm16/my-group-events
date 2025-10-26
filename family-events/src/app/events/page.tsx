import Link from 'next/link';
import EventsExplorer from '@/components/EventsExplorer';
import dynamic from 'next/dynamic';
import ConfettiLink from '@/components/ConfettiLink';
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
  hostImage?: string | null;
  holidayKey?: string | null;
  rsvps: { status: string; userId?: string }[];
  recurrence?: any | null;
  recurrenceExceptions?: string[] | null;
  coHosts?: { id: string; name: string | null }[];
};

export default async function EventsPage({ searchParams }: { searchParams?: { page?: string; family?: string } }) {
  const session = await getServerSession(authOptions);
  const authorized = !!session?.user?.email;
  const page = Number(searchParams?.page ?? '1') || 1;
  const pageSize = 12;
  let events: EventCard[] = [];
  let total = 0;
  const filterFamilyId = (searchParams?.family ?? '').trim();
  if (authorized) {
    const user = await prisma.user.findFirst({ where: { email: session!.user!.email as string } });
    if (user) {
      // Collect all families the user belongs to
      const memberships = await prisma.familyMembership.findMany({ where: { userId: user.id }, select: { familyId: true } });
      const familyIds = new Set<string>(memberships.map((m) => m.familyId));
      if (user.familyId) familyIds.add(user.familyId);

      const familyList = Array.from(familyIds);
      const limitToFamily = filterFamilyId && familyIds.has(filterFamilyId) ? filterFamilyId : '';

      const orClauses: any[] = [];
      // Events I host
      orClauses.push(limitToFamily ? { hostId: user.id, familyId: limitToFamily } : { hostId: user.id });
      // Events I'm invited to (RSVP exists)
      orClauses.push(limitToFamily ? { familyId: limitToFamily, rsvps: { some: { userId: user.id } } } : { rsvps: { some: { userId: user.id } } });
      // Public events in my families
      if (limitToFamily) {
        orClauses.push({ familyId: limitToFamily, visibleToAll: true });
      } else if (familyList.length > 0) {
        orClauses.push({ familyId: { in: familyList }, visibleToAll: true });
      }

      const where = { OR: orClauses } as any;
      total = await prisma.event.count({ where });
      const rows = await prisma.event.findMany({
        where,
        orderBy: { startAt: 'asc' },
        include: { rsvps: { select: { status: true, userId: true } }, host: { select: { name: true, id: true, image: true } }, coHosts: { include: { user: { select: { id: true, name: true } } } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      // Expand recurrence into virtual occurrences for display
      const expanded: EventCard[] = [];
      for (const r of rows as any[]) {
        const base: EventCard = {
          id: r.id,
          title: r.title,
          description: r.description,
          location: r.location,
          startAt: r.startAt.toISOString(),
          endAt: r.endAt ? r.endAt.toISOString() : null,
          host: { name: r.host?.name ?? null },
          hostId: r.host?.id ?? null,
          hostImage: (r.host as any)?.image ?? null,
          holidayKey: r.holidayKey ?? null,
          rsvps: r.rsvps.map((x: any) => ({ status: x.status, userId: x.userId })),
          recurrence: r.recurrence ?? null,
          recurrenceExceptions: (r.recurrenceExceptions as any) ?? null,
          coHosts: (r.coHosts || []).map((h: any) => ({ id: h.userId, name: h.user?.name ?? null })),
        };
        if (!r.recurrence?.freq) {
          expanded.push(base);
          continue;
        }
        // Always include the base instance
        expanded.push(base);
        // Generate weekly occurrences until limit
        if (r.recurrence.freq === 'WEEKLY' && r.recurrence.until) {
          const until = new Date(r.recurrence.until);
          const skipHolidays = !!r.recurrence.skipHolidays;
          const exceptions = new Set<string>(Array.isArray(r.recurrenceExceptions) ? r.recurrenceExceptions : []);
          let cursor = new Date(r.startAt);
          const durationMs = r.endAt ? (new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) : 0;
          // Cap to reasonable max occurrences to avoid huge expansions
          let guard = 0;
          while (true) {
            cursor = new Date(cursor.getTime());
            cursor.setDate(cursor.getDate() + 7);
            if (cursor > until) break;
            // Skip exceptions
            const iso = cursor.toISOString();
            if (exceptions.has(iso)) continue;
            // Optional: could skip holidays at display time if desired. For now, do not fetch holidays on server here.
            const startISO = iso;
            const endISO = durationMs ? new Date(new Date(iso).getTime() + durationMs).toISOString() : null;
            expanded.push({ ...base, startAt: startISO, endAt: endISO });
            guard++;
            if (guard > 260) break; // ~5 years cap
          }
        }
      }
      // Sort by startAt to keep consistent order
      expanded.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
      events = expanded;
    }
  }
  return (
    <main className="container-page space-y-6">

      {/* Content */}
      {!authorized ? (
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לראות וליצור אירועים.</p>
      ) : events.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <div className="text-5xl mb-3">🗓️</div>
          <h2 className="text-xl font-semibold mb-1">עדיין אין אירועים</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">התחילו את החגיגה הראשונה שלכם – זה מהיר וכיף!</p>
          <ConfettiLink className="inline-block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors" href="/events/new" confettiCount={36}>יצירת אירוע ראשון</ConfettiLink>
        </section>
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


