import Link from 'next/link';
import EventsCards from '@/components/EventsCards';

type EventCard = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  host: { name: string | null };
  rsvps: { status: string }[];
};

async function fetchEvents(page: number): Promise<{ events: EventCard[]; authorized: boolean; page: number; pageSize: number; total: number }> {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/events?page=${page}`, { cache: 'no-store' });
  if (!res.ok) {
    return { events: [], authorized: false, page: 1, pageSize: 12, total: 0 };
  }
  const data = await res.json();
  return { events: data.events as EventCard[], authorized: true, page: data.page, pageSize: data.pageSize, total: data.total };
}

export default async function EventsPage({ searchParams }: { searchParams?: { page?: string } }) {
  const page = Number(searchParams?.page ?? '1') || 1;
  const { events, authorized, total, pageSize } = await fetchEvents(page);
  return (
    <main className="container-page space-y-4">
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
        <>
          <EventsCards initial={events} />
          <Pagination total={total} pageSize={pageSize} page={page} />
        </>
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


