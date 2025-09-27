"use client";
import { useDeferredValue, useMemo, useState } from 'react';

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
};

export default function EventsSearch({ items, onFilter }: { items: EventItem[]; onFilter: (filtered: EventItem[]) => void }) {
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const filtered = useMemo(() => {
    const query = dq.trim().toLowerCase();
    if (!query) return items;
    return items.filter((e) =>
      [e.title, e.description ?? '', e.location ?? '', new Date(e.startAt).toLocaleDateString('he-IL')]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [items, dq]);

  useMemo(() => onFilter(filtered), [filtered, onFilter]);

  return (
    <div className="max-w-xl">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        placeholder="חיפוש אירועים..."
      />
    </div>
  );
}

