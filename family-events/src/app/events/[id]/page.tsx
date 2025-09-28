import Link from 'next/link';
import WhatsAppShare from '@/components/WhatsAppShare';
import RSVPButtons from '@/components/RSVPButtons';
import DeleteEventButton from '@/components/DeleteEventButton';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import CopyTools from '@/components/CopyTools';

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  externalLink: string | null;
  holidayKey?: string | null;
  host: { id?: string; name: string | null };
  rsvps: { id: string; status: string; user: { id: string; name: string | null; phone?: string | null } }[];
  familyMembers?: { id: string; name: string | null; phone: string | null }[];
};

async function fetchEvent(id: string): Promise<EventDetail | null> {
  const row = await prisma.event.findUnique({ where: { id }, include: { rsvps: { include: { user: true } }, host: true, family: { include: { members: true } } } });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt ? row.endAt.toISOString() : null,
    externalLink: row.externalLink,
    holidayKey: row.holidayKey ?? null,
    host: { id: row.hostId, name: row.host?.name ?? null },
    rsvps: row.rsvps.map(r => ({ id: r.id, status: r.status, user: { id: r.userId, name: r.user?.name ?? null, phone: (r.user as any)?.phone ?? null } })),
    familyMembers: (row.family?.members || []).map(m => ({ id: m.id, name: m.name ?? null, phone: (m as any).phone ?? null })),
  };
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const [event, session] = await Promise.all([
    fetchEvent(params.id),
    getServerSession(authOptions),
  ]);
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
  const userId = (session?.user as any)?.id as string | undefined;
  const myRsvp = userId ? event.rsvps.find(r => r.user.id === userId)?.status ?? null : null;
  const isHost = userId ? event.host?.id === userId : false;
  const toRSVPStatus = (s: string | null): 'APPROVED' | 'DECLINED' | 'MAYBE' | null => {
    return s === 'APPROVED' || s === 'DECLINED' || s === 'MAYBE' ? s : null;
  };
  const userStatus = new Map<string, string>();
  for (const r of event.rsvps) userStatus.set(r.user.id, r.status);
  const pending = (event.familyMembers || []).filter(m => m.phone && (!userStatus.has(m.id) || userStatus.get(m.id) !== 'APPROVED'));
  const shareUrl = `${base}/events/${event.id}`;
  const dateText = new Date(event.startAt).toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' });
  const locText = event.location ? `במקום: ${event.location} ` : '';
  const perUserMsg = (name?: string | null) => `היי${name ? ' ' + name : ''}! 🙌\nמזכירים לאשר הגעה ל"${event.title}"\n🗓️ ${dateText} ${locText}\nלאישור: ${shareUrl}`;
  const bulkMsg = `🙌 תזכורת לאישור הגעה ל"${event.title}"\n🗓️ ${dateText} ${locText}\nלאישור: ${shareUrl}`;
  const pendingNumbers = pending.map(p => p.phone!) as string[];
  return (
    <main className="container-page space-y-4">
      <HeaderActions id={event.id} wa={wa} ics={`${base}/api/events/${event.id}/ics`} isHost={isHost} event={event} shareUrl={`${base}/events/${event.id}`} />
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
          <RSVPButtons eventId={event.id} initial={toRSVPStatus(myRsvp)} />
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
      {isHost && pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">תזכורות לוואטסאפ (טרם אישרו)</h2>
          <CopyTools numbers={pendingNumbers} message={bulkMsg} />
          <ul className="space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-900">
                <span>{p.name || p.phone}</span>
                <a className="px-3 py-1 bg-green-600 text-white rounded" href={`https://wa.me/${encodeURIComponent(p.phone!)}?text=${encodeURIComponent(perUserMsg(p.name))}`} target="_blank" rel="noreferrer">תזכורת</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function HeaderActions({ id, wa, ics, isHost, event, shareUrl }: { id: string; wa: string; ics: string; isHost: boolean; event: any; shareUrl: string }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">פרטי אירוע</h1>
      <div className="flex gap-2">
        <WhatsAppShare eventId={id} title={event.title} startAtISO={event.startAt} location={event.location} typeKey={event.holidayKey ?? null} shareUrl={shareUrl} />
        <Link className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={ics}>ייצוא ל-ICS</Link>
        {isHost && <Link className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={`/events/${id}/edit`}>עריכה</Link>}
        {isHost && <DeleteEventButton id={id} />}
        <Link className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href="/events">חזרה</Link>
      </div>
    </div>
  );
}

