import Link from 'next/link';
import WhatsAppShare from '@/components/WhatsAppShare';
import RSVPButtons from '@/components/RSVPButtons';
import DeleteEventButton from '@/components/DeleteEventButton';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import PendingWhatsApp from '@/components/PendingWhatsApp';

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
  coHosts?: { id: string; name: string | null }[];
  rsvps: { id: string; status: string; note: string | null; user: { id: string; name: string | null; image?: string | null; groupId?: string | null; groupNickname?: string | null } }[];
  familyMembers?: { id: string; name: string | null }[];
};

async function fetchEvent(id: string): Promise<EventDetail | null> {
  const row = await prisma.event.findUnique({ where: { id }, include: { rsvps: { include: { user: { select: { id: true, name: true, image: true, groupId: true, group: { select: { id: true, nickname: true, parentId: true } } } } } }, host: true, family: { include: { members: true } }, coHosts: { include: { user: true } } } });
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
    coHosts: (row.coHosts || []).map(h => ({ id: h.userId, name: h.user?.name ?? null })),
    rsvps: row.rsvps.map(r => ({ id: r.id, status: r.status, note: r.note ?? null, user: { id: r.userId, name: r.user?.name ?? null, image: (r.user as any)?.image ?? null, groupId: (r.user as any)?.groupId ?? null, groupNickname: (r.user as any)?.group?.nickname ?? null } })),
    familyMembers: (row.family?.members || []).map(m => ({ id: m.id, name: m.name ?? null })),
  };
}

export default async function EventDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { [key: string]: string | string[] | undefined } }) {
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
  const pendingCount = (event.familyMembers || []).filter(m => (!userStatus.has(m.id) || userStatus.get(m.id) !== 'APPROVED')).length;
  const shareUrl = `${base}/events/${event.id}`;
  const dateText = new Date(event.startAt).toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' });
  const locText = event.location ? `במקום: ${event.location} ` : '';
  const pendForClient = (event.familyMembers || []).filter(p => (!userStatus.has(p.id) || userStatus.get(p.id) !== 'APPROVED'));
  const from = typeof searchParams?.from === 'string' ? (searchParams!.from as string) : undefined;
  return (
    <main className="container-page space-y-4">
      <HeaderActions id={event.id} wa={wa} ics={`${base}/api/events/${event.id}/ics`} isHost={isHost} event={event} shareUrl={`${base}/events/${event.id}`} backHref={from || '/events'} />
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
          {event.coHosts && event.coHosts.length > 0 && (
            <div className="md:col-span-2">
              <dt className="text-sm text-gray-500">מארחים נוספים</dt>
              <dd className="flex flex-wrap gap-2 mt-1 text-sm">
                {event.coHosts.map(h => (<span key={h.id} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">{h.name ?? h.id.slice(0,6)}</span>))}
              </dd>
            </div>
          )}
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
          <RSVPButtons eventId={event.id} initial={toRSVPStatus(myRsvp)} canGroup={true} canAll={isHost || (session?.user as any)?.role === 'admin'} />
        </div>
      </div>
      <section>
        <h2 className="font-semibold mb-2">מוזמנים לפי קבוצה</h2>
        {(() => {
          const byGroup = new Map<string, typeof event.rsvps>();
          for (const r of event.rsvps) {
            const key = r.user.groupNickname || 'ללא קבוצה';
            if (!byGroup.has(key)) byGroup.set(key, [] as any);
            (byGroup.get(key) as any).push(r);
          }
          const groups = Array.from(byGroup.entries()).sort((a, b) => a[0].localeCompare(b[0]));
          if (groups.length === 0) return <p className="text-gray-600 dark:text-gray-300">אין מוזמנים עדיין.</p>;
          return (
            <div className="space-y-4">
              {groups.map(([gname, list]) => (
                <div key={gname} className="rounded border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
                  <div className="font-medium mb-2">{gname}</div>
                  <ul className="flex flex-wrap gap-2">
                    {list.map((r) => (
                      <li key={r.id} className="inline-flex items-center gap-2 px-2 py-1 rounded border text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(r.user.image && r.user.image.startsWith('http')) ? r.user.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(r.user.name || 'user')}`}
                          alt={r.user.name || ''}
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{r.user.name || '—'}</span>
                        <span className={[
                          'px-2 py-0.5 rounded text-xs',
                          r.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200' :
                          r.status === 'DECLINED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200' :
                          r.status === 'MAYBE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                        ].join(' ')}>
                          {r.status === 'NA' ? '—' : r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          );
        })()}
      </section>
      {isHost && pendingCount > 0 && (
        <>
          <h2 className="font-semibold">תזכורות (למי שטרם אישרו)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">יש {pendingCount} חברים שעדיין לא אישרו.</p>
        </>
      )}
    </main>
  );
}

function HeaderActions({ id, wa, ics, isHost, event, shareUrl, backHref }: { id: string; wa: string; ics: string; isHost: boolean; event: any; shareUrl: string; backHref: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h1 className="text-2xl font-bold">פרטי אירוע</h1>
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <WhatsAppShare eventId={id} title={event.title} startAtISO={event.startAt} location={event.location} typeKey={event.holidayKey ?? null} shareUrl={shareUrl} />
        <Link className="px-2 py-1 sm:px-3 sm:py-2 text-sm bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={ics}>ייצוא ל-ICS</Link>
        {isHost && <Link className="px-2 py-1 sm:px-3 sm:py-2 text-sm bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={`/events/${id}/edit`}>עריכה</Link>}
        {isHost && <DeleteEventButton id={id} />}
        <Link className="px-2 py-1 sm:px-3 sm:py-2 text-sm bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={backHref}>חזרה</Link>
      </div>
    </div>
  );
}

