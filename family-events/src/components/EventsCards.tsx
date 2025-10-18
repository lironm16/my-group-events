"use client";
import Link from 'next/link';
import { useMemo, useState } from 'react';
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

export default function EventsCards({ initial }: { initial: EventCard[] }) {
  const [filtered, setFiltered] = useState<EventCard[]>(initial);
  const items = useMemo<EventItem[]>(
    () =>
      initial.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startAt: e.startAt,
      })),
    [initial]
  );

  return (
    <>
      <EventsSearch
        items={items}
        onFilter={(f) => {
          const ids = new Set(f.map((x) => x.id));
          setFiltered(initial.filter((e) => ids.has(e.id)));
        }}
      />
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
              <span className="text-gray-600 dark:text-gray-400">
                {e.rsvps.filter(r=>r.status==='APPROVED').length}/{e.rsvps.length} אישרו
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800" href={`/events/${e.id}`}>
                פרטים
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

