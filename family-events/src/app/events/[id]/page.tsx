import Link from 'next/link';
import WhatsAppShare from '@/components/WhatsAppShare';
import DeleteEventButton from '@/components/DeleteEventButton';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import RsvpSummary from '@/components/RsvpSummary';
import RsvpInviteesList from '@/components/RsvpInviteesList';
import RsvpActionPrompt from '@/components/RsvpActionPrompt';

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
  if (!event) {
    return (
      <main className="container-page">
        <p className="text-gray-600 dark:text-gray-300">לא נמצאו פרטי אירוע.</p>
        <Link className="inline-block mt-4 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded" href="/events">חזרה</Link>
      </main>
    );
  }
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  const sessionEmail = typeof session?.user?.email === 'string' ? session.user.email : undefined;
  let viewer: { id: string; groupId: string | null; familyId: string | null; role: string | null } | null = null;
  if (sessionUserId) {
    viewer = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true, groupId: true, familyId: true, role: true } });
  } else if (sessionEmail) {
    viewer = await prisma.user.findFirst({ where: { email: sessionEmail }, select: { id: true, groupId: true, familyId: true, role: true } });
  }
  const userId = viewer?.id ?? sessionUserId;
  const isHost = userId ? event.host?.id === userId : false;
  const isCoHost = userId ? (event.coHosts || []).some((h) => h.id === userId) : false;
  const canEdit = isHost || isCoHost;
  const canDelete = isHost;
  const canGroup = !!viewer?.groupId;
  const canAll = canEdit || viewer?.role === 'admin';
  const viewerRsvp = userId ? event.rsvps.find((r) => r.user.id === userId) : null;
  const normalizeStatus = (s: string | null | undefined): 'APPROVED' | 'DECLINED' | 'MAYBE' | 'NA' => {
    return s === 'APPROVED' || s === 'DECLINED' || s === 'MAYBE' ? s : 'NA';
  };
  const viewerStatus = viewerRsvp ? normalizeStatus(viewerRsvp.status) : null;
  const approvedCount = event.rsvps.filter(r => r.status === 'APPROVED').length;
  const maybeCount = event.rsvps.filter(r => r.status === 'MAYBE').length;
  const declinedCount = event.rsvps.filter(r => r.status === 'DECLINED').length;
  const waitingCount = event.rsvps.filter(r => r.status === 'NA').length;
  const totalCount = event.rsvps.length;
  const allHosts = [
    ...(event.host?.name ? [{ id: event.host?.id || 'host', name: event.host?.name }] : []),
    ...((event.coHosts || []))
  ];
  const shareUrl = `${base}/events/${event.id}`;
  const from = typeof searchParams?.from === 'string' ? (searchParams!.from as string) : undefined;
  const occurrenceStartAt = typeof searchParams?.occurrenceStartAt === 'string' ? (searchParams!.occurrenceStartAt as string) : undefined;
  return (
    <main className="container-page space-y-4">
      <HeaderActions id={event.id} occurrenceStartAt={occurrenceStartAt} ics={`${base}/api/events/${event.id}/ics`} canEdit={canEdit} canDelete={canDelete} event={event} backHref={from || '/events'} />
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        {event.description && (
          <p className="mb-4 text-gray-700 dark:text-gray-300">{event.description}</p>
        )}
        <dl className="grid md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">מיקום</dt>
            <dd>{event.location ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">התחלה</dt>
            <dd>{(() => { const d=new Date(event.startAt); return (d.getHours()||d.getMinutes()) ? d.toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' }) : d.toLocaleDateString('he-IL', { dateStyle: 'full' }); })()}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">סיום</dt>
            <dd>{event.endAt ? (() => { const d=new Date(event.endAt!); return (d.getHours()||d.getMinutes()) ? d.toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' }) : d.toLocaleDateString('he-IL', { dateStyle: 'full' }); })() : '—'}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-sm text-gray-500">מארחים</dt>
            <dd className="flex flex-wrap gap-2 mt-1 text-sm">
              {allHosts.length === 0 ? (
                <span>—</span>
              ) : (
                allHosts.map(h => (<span key={h.id} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">{h.name ?? String(h.id).slice(0,6)}</span>))
              )}
            </dd>
          </div>
          {event.externalLink && (
            <div className="md:col-span-2">
              <dt className="text-sm text-gray-500">קישור</dt>
              <dd><a className="text-blue-600" href={event.externalLink} target="_blank" rel="noreferrer">פתיחה</a></dd>
            </div>
          )}
        </dl>
        
        {/* RSVP quick section removed; using grouped editor below */}
      </div>
      {/* RSVP summary (with toggle) */}
      <section className="space-y-3">
        <RsvpSummary approved={approvedCount} maybe={maybeCount} declined={declinedCount} waiting={waitingCount} total={totalCount} />
        {viewerStatus ? (
          <RsvpActionPrompt eventId={event.id} status={viewerStatus} note={viewerRsvp?.note ?? null} canGroup={canGroup} canAll={canAll} />
        ) : null}
        <RsvpInviteesList list={event.rsvps} />
        {/* WhatsApp share section moved here, right after RSVP bar */}
        <div className="rounded border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">שיתוף בוואטסאפ</h3>
          </div>
          <div className="mt-2">
            <WhatsAppShare
              eventId={event.id}
              title={event.title}
              startAtISO={event.startAt}
              location={event.location}
              typeKey={event.holidayKey ?? null}
              shareUrl={shareUrl}
              hasResponders={(event.rsvps || []).some((r: any) => r.status === 'APPROVED' || r.status === 'MAYBE' || r.status === 'DECLINED')}
              includeReminders={(event.rsvps || []).every((r: any) => r.status === 'NA')}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

// RsvpSummary moved to client component

function HeaderActions({ id, occurrenceStartAt, ics, canEdit, canDelete, event, backHref }: { id: string; occurrenceStartAt?: string; ics: string; canEdit: boolean; canDelete: boolean; event: any; backHref: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Link className="px-3 py-2 rounded border text-sm" href={backHref}>חזרה</Link>
        <div className="flex flex-wrap gap-2 items-center">
          <Link className="px-2 py-1 sm:px-3 sm:py-2 text-sm bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={ics}>ייצוא ל-ICS</Link>
          {canEdit && <Link className="px-2 py-1 sm:px-3 sm:py-2 text-sm bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={`/events/${id}/edit`}>עריכה</Link>}
          {canDelete && <DeleteEventButton id={id} occurrenceStartAt={occurrenceStartAt} />}
        </div>
      </div>
      <h1 className="text-2xl font-bold">{event.title}</h1>
    </div>
  );
}

