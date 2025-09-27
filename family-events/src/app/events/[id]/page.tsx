import Link from 'next/link';
import RSVPButtons from '@/components/RSVPButtons';
import DeleteEventButton from '@/components/DeleteEventButton';

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  externalLink: string | null;
  host: { id?: string; name: string | null };
  rsvps: { id: string; status: string; user: { id: string; name: string | null } }[];
};

async function fetchEvent(id: string): Promise<EventDetail | null> {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/events/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.event as EventDetail;
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await fetchEvent(params.id);
  const base = process.env.NEXTAUTH_URL ?? '';
  const shareText = `מצטרפים לאירוע? ראו פרטים וקישור: ${base}/events/${params.id}`;
  const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  if (!event) {
    return (
      <main className="container-page">
        <p className="text-gray-600 dark:text-gray-300">לא נמצאו פרטי אירוע.</p>
        <Link className="inline-block mt-4 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded" href="/events">חזרה</Link>
      </main>
    );
  }
  return (
    <main className="container-page space-y-4">
      <HeaderActions id={event.id} wa={wa} />
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <dl className="grid md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">מיקום</dt>
            <dd>{event.location ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">התחלה</dt>
            <dd>{new Date(event.startAt).toLocaleString('he-IL')}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">סיום</dt>
            <dd>{event.endAt ? new Date(event.endAt).toLocaleString('he-IL') : '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">מארח</dt>
            <dd>{event.host?.name ?? '—'}</dd>
          </div>
          {event.externalLink && (
            <div className="md:col-span-2">
              <dt className="text-sm text-gray-500">קישור</dt>
              <dd><a className="text-blue-600" href={event.externalLink} target="_blank" rel="noreferrer">פתיחה</a></dd>
            </div>
          )}
        </dl>
        {event.description && (
          <p className="mt-4 text-gray-700 dark:text-gray-300">{event.description}</p>
        )}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">אישור הגעה</h3>
          {/* Initial status is the first RSVP (for the current user) if present; server API restricts data to family/users */}
          <RSVPButtons eventId={event.id} initial={event.rsvps[0]?.status ?? null as any} />
        </div>
      </div>
      <section>
        <h2 className="font-semibold mb-2">אישורי הגעה</h2>
        {event.rsvps.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">אין אישורים עדיין.</p>
        ) : (
          <ul className="space-y-2">
            {event.rsvps.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-900">
                <span>{r.user?.name ?? '—'}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function HeaderActions({ id, wa }: { id: string; wa: string }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">פרטי אירוע</h1>
      <div className="flex gap-2">
        <Link className="px-3 py-2 bg-green-600 text-white rounded" href={wa}>שיתוף בוואטסאפ</Link>
        <Link className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={`/events/${id}/edit`}>עריכה</Link>
        <DeleteEventButton id={id} />
        <Link className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href="/events">חזרה</Link>
      </div>
    </div>
  );
}

