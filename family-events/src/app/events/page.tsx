import Link from 'next/link';
import EventsSearch, { EventItem } from '@/components/EventsSearch';

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
      {authorized && (
        <ClientSearch initial={events} />
      )}
      {!authorized ? (
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לראות וליצור אירועים.</p>
      ) : events.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">אין אירועים להצגה כרגע.</p>
      ) : (
        <>
          <Cards initial={events} />
          <Pagination total={total} pageSize={pageSize} page={page} />
        </>
      )}
    </main>
  );
}

function ClientSearch({ initial }: { initial: EventItem[] }) {
  return (
    <div>
      <EventsSearch items={initial} onFilter={() => {}} />
    </div>
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

"use client";
import { useMemo, useState } from 'react';

function Cards({ initial }: { initial: EventCard[] }) {
  const [filtered, setFiltered] = useState<EventCard[]>(initial);
  const items = useMemo(() => initial.map(e => ({ id: e.id, title: e.title, description: e.description, location: e.location, startAt: e.startAt })), [initial]);
  return (
    <>
      <EventsSearch items={items} onFilter={(f) => {
        const ids = new Set(f.map(x => x.id));
        setFiltered(initial.filter(e => ids.has(e.id)));
      }} />
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <li key={e.id} className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">{e.title}</h3>
                {e.location && <p className="text-sm text-gray-600 dark:text-gray-400">{e.location}</p>}
              </div>
              <span className="text-xs text-gray-500">{new Date(e.startAt).toLocaleString('he-IL')}</span>
            </div>
            {e.description && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{e.description}</p>}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">מארח: {e.host?.name ?? '—'}</span>
              <span className="text-gray-600 dark:text-gray-400">אישורים: {e.rsvps.length}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800" href={`/events/${e.id}`}>פרטים</Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

