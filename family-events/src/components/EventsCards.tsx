"use client";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import EventsSearch from '@/components/EventsSearch';

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
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter((e) => {
      const haystack = [
        e.title,
        e.description ?? '',
        e.location ?? '',
        e.host?.name ?? '',
        new Date(e.startAt).toLocaleDateString('he-IL'),
        new Date(e.startAt).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' }),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [initial, query]);

  return (
    <>
      <EventsSearch value={query} onChange={setQuery} />
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <li key={e.id} className="relative rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 hover:shadow transition-shadow">
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
            <Link href={`/events/${e.id}`} className="absolute inset-0 z-10 block" aria-label={e.title}>
              <span className="sr-only">{e.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

