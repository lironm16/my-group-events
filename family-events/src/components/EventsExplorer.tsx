"use client";
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
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

type TabKey = 'today' | 'week' | 'month' | 'all';

export default function EventsExplorer({ initial }: { initial: EventCard[] }) {
  const [tab, setTab] = useState<TabKey>('today');
  const base = useMemo(() => filterByTab(initial, tab), [initial, tab]);

  const items: EventItem[] = useMemo(
    () =>
      base.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startAt: e.startAt,
      })),
    [base]
  );

  const [filtered, setFiltered] = useState<EventCard[]>(base);
  const deferredBase = useDeferredValue(base);

  // Reset filtered when base changes (tab switch)
  useMemo(() => setFiltered(deferredBase), [deferredBase]);

  return (
    <>
      <Tabs tab={tab} onChange={setTab} />
      <EventsSearch
        items={items}
        onFilter={(f) => {
          const ids = new Set(f.map((x) => x.id));
          setFiltered(base.filter((e) => ids.has(e.id)));
        }}
      />
      <Cards list={filtered} />
    </>
  );
}

function Tabs({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const btn = (key: TabKey, label: string) => (
    <button
      key={key}
      onClick={() => onChange(key)}
      className={[
        'px-3 py-1 rounded border text-sm',
        tab === key ? 'bg-blue-600 text-white border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
      ].join(' ')}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-4 flex gap-2">
      {btn('today', 'היום')}
      {btn('week', 'השבוע')}
      {btn('month', 'החודש')}
      {btn('all', 'הכל')}
    </div>
  );
}

function filterByTab(events: EventCard[], tab: TabKey): EventCard[] {
  if (tab === 'all') return events;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (tab === 'today') {
    return events.filter((e) => {
      const d = new Date(e.startAt);
      return d >= startOfToday && d <= endOfToday;
    });
  }
  if (tab === 'week') {
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setMilliseconds(endOfWeek.getMilliseconds() - 1);
    return events.filter((e) => {
      const d = new Date(e.startAt);
      return d >= startOfToday && d <= endOfWeek;
    });
  }
  // month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const endOfMonth = new Date(startOfNextMonth.getTime() - 1);
  return events.filter((e) => {
    const d = new Date(e.startAt);
    return d >= startOfMonth && d <= endOfMonth;
  });
}

function Cards({ list }: { list: EventCard[] }) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((e) => (
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
            <Link className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800" href={`/events/${e.id}`}>
              פרטים
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

