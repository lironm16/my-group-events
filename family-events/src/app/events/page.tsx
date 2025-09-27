import Link from 'next/link';

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

async function fetchEvents(): Promise<EventCard[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/events`, { cache: 'no-store' });
  if (!res.ok) {
    // When unauthenticated, show empty list to avoid redirect loops
    return [];
  }
  const data = await res.json();
  return data.events as EventCard[];
}

export default async function EventsPage() {
  const events = await fetchEvents();
  return (
    <main className="container-page space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אירועים</h1>
        <Link className="px-3 py-2 bg-blue-600 text-white rounded" href="/events/new">אירוע חדש</Link>
      </div>
      {events.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">אין אירועים להצגה כרגע.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
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
      )}
    </main>
  );
}

