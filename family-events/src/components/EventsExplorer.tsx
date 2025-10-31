"use client";
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import EventsSearch from '@/components/EventsSearch';
import CalendarMonth, { type CalendarEvent } from '@/components/CalendarMonth';
import EventTypeIcon from '@/components/EventTypeIcon';
// Confetti removed from tiles to improve tap behavior

type EventCard = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  host: { name: string | null };
  hostId?: string | null;
  hostImage?: string | null;
  holidayKey?: string | null;
  rsvps: { status: string; userId?: string }[];
  recurrence?: any | null;
  recurrenceExceptions?: string[] | null;
  coHosts?: { id: string; name: string | null }[];
};

type ScopeKey = 'mine' | 'all' | `group:${string}`;
type ViewKey = 'list' | 'calendar';
type TimeKey = 'upcoming' | 'today' | 'week' | 'month' | 'past';
// Metric toggle removed from main page per request

export default function EventsExplorer({ initial }: { initial: EventCard[] }) {
  const [filterKey, setFilterKey] = useState<ScopeKey>('mine');
  const [view, setView] = useState<ViewKey>('list');
  const [timeKey, setTimeKey] = useState<TimeKey>('upcoming');
  const [myUserId, setMyUserId] = useState<string>('');
  const [groupOptions, setGroupOptions] = useState<{ id: string; nickname: string; memberIds: string[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    (async () => {
      try {
        const [meRes, groupsRes] = await Promise.all([
          fetch('/api/users/me', { cache: 'no-store' }),
          fetch('/api/family/groups', { cache: 'no-store' }),
        ]);
        const me = await meRes.json();
        const gj = await groupsRes.json();
        setMyUserId(me?.user?.id || '');
        const opts = (gj?.groups || []).map((g: any) => ({ id: g.id, nickname: g.nickname, memberIds: (g.members || []).map((m: any) => m.id) }));
        setGroupOptions(opts);
      } catch {}
    })();
  }, []);
  const baseAll = initial;
  const base = useMemo(() => filterByKey(baseAll, filterKey, myUserId, groupOptions), [baseAll, filterKey, myUserId, groupOptions]);
  const scoped = useMemo(() => filterByTime(base, timeKey), [base, timeKey]);
  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return scoped;
    return scoped.filter((event) => {
      const haystack = [
        event.title,
        event.description ?? '',
        event.location ?? '',
        event.host?.name ?? '',
        ...(event.coHosts || []).map((h) => h.name ?? ''),
        new Date(event.startAt).toLocaleDateString('he-IL'),
        new Date(event.startAt).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' }),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [scoped, deferredSearch]);

  // Initialize view/filter from URL
  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    if (v === 'calendar') setView('calendar');
    const fk = searchParams.get('filter');
    if (fk === 'mine' || fk === 'all' || (fk && fk.startsWith('group:'))) setFilterKey(fk as ScopeKey);
    const tk = (searchParams.get('time') || '').toLowerCase();
    if (tk === 'today' || tk === 'week' || tk === 'month' || tk === 'past' || tk === 'upcoming') setTimeKey(tk as TimeKey);
    // metric toggle removed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist view+filter in URL (without scrolling)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (view === 'calendar') sp.set('view', 'calendar');
    else sp.delete('view');
    if (filterKey) sp.set('filter', filterKey);
    if (timeKey && timeKey !== 'upcoming') sp.set('time', timeKey);
    else sp.delete('time');
    // metric toggle removed
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [view, filterKey, timeKey, router, pathname, searchParams]);

  const calItems: CalendarEvent[] = useMemo(
    () => scoped.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, location: e.location, occurrenceStartAt: e.recurrence ? e.startAt : undefined })),
    [scoped]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <GroupFilter value={filterKey} groups={groupOptions} onChange={(v)=>setFilterKey(v)} />
        <TimeFilter value={timeKey} onChange={setTimeKey} />
        <ViewToggle view={view} onChange={setView} />
      </div>
      {view === 'list' && (
        <EventsSearch value={searchQuery} onChange={setSearchQuery} />
      )}
      {view === 'list' ? (
        <Cards list={filtered} />
      ) : (
        <div className="mt-4 animate-fade-in"><CalendarMonth events={calItems} /></div>
      )}
      <BackToTop />
    </>
  );
}
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="back-to-top-btn px-3 py-2 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all hover:-translate-y-0.5"
      aria-label="חזרה לראש הדף"
      onClick={() => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {} }}
    >⬆️</button>
  );
}

// Tabs removed per request

// Scope tabs removed; integrated into GroupFilter

function ViewToggle({ view, onChange }: { view: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <div className="flex gap-2 ml-auto">
      <button
        onClick={() => onChange('list')}
        title="תצוגת רשימה"
        aria-label="תצוגת רשימה"
        className={[
          'px-3 py-1 rounded border',
          view === 'list' ? 'bg-blue-600 text-white border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
        ].join(' ')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        onClick={() => onChange('calendar')}
        title="תצוגת לוח שנה"
        aria-label="תצוגת לוח שנה"
        className={[
          'px-3 py-1 rounded border',
          view === 'calendar' ? 'bg-blue-600 text-white border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
        ].join(' ')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 9h18" />
        </svg>
      </button>
    </div>
  );
}

function GroupFilter({ value, groups, onChange }: { value: ScopeKey; groups: { id: string; nickname: string }[]; onChange: (v: ScopeKey) => void }) {
  return (
    <select
      className="px-2 py-1 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as ScopeKey)}
    >
      <option value="mine">שלי</option>
      <option value="all">כולם</option>
      {groups.map((g) => (
        <option key={g.id} value={`group:${g.id}`}>{g.nickname}</option>
      ))}
    </select>
  );
}
function TimeFilter({ value, onChange }: { value: TimeKey; onChange: (v: TimeKey) => void }) {
  const options: { key: TimeKey; label: string }[] = [
    { key: 'upcoming', label: 'קרובים' },
    { key: 'today', label: 'היום' },
    { key: 'week', label: 'השבוע' },
    { key: 'month', label: 'החודש' },
    { key: 'past', label: 'עבר' },
  ];
  return (
    <div className="flex gap-1 bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-md p-1 text-sm">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={[
            'px-2 py-1 rounded transition-all',
            value === opt.key ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-px'
          ].join(' ')}
          aria-pressed={value === opt.key}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// Time tabs removed

function filterByKey(
  events: EventCard[],
  key: ScopeKey,
  myUserId: string,
  groups: { id: string; memberIds: string[] }[]
): EventCard[] {
  if (!myUserId) return events;
  if (key === 'all') return events;
  if (key === 'mine') {
    // Events I host or I'm invited to
    return events.filter((e) => e.hostId === myUserId || e.rsvps.some((r) => r.userId === myUserId));
  }
  if (key.startsWith('group:')) {
    // IMPORTANT: Filter ONLY by host's current group membership, not invitees
    const gid = key.slice('group:'.length);
    const group = groups.find((g) => g.id === gid);
    if (!group) return events;
    const set = new Set<string>(group.memberIds);
    return events.filter((e) => !!e.hostId && set.has(e.hostId));
  }
  return events;
}

function filterByTime(events: EventCard[], key: TimeKey): EventCard[] {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfWeek = new Date(startOfToday);
  // Assuming week ends on Saturday in IL (RTL), add days until Saturday (6)
  const day = startOfToday.getDay(); // 0=Sun .. 6=Sat
  const addToSat = (6 - day + 7) % 7;
  endOfWeek.setDate(endOfWeek.getDate() + addToSat);
  endOfWeek.setHours(23, 59, 59, 999);

  const endOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 0, 23, 59, 59, 999);

  if (key === 'upcoming') return events.filter(e => new Date(e.startAt) >= startOfToday);
  if (key === 'today') return events.filter(e => {
    const d = new Date(e.startAt);
    return d >= startOfToday && d <= endOfToday;
  });
  if (key === 'week') return events.filter(e => {
    const d = new Date(e.startAt);
    return d >= startOfToday && d <= endOfWeek;
  });
  if (key === 'month') return events.filter(e => {
    const d = new Date(e.startAt);
    return d >= startOfToday && d <= endOfMonth;
  });
  if (key === 'past') return events.filter(e => new Date(e.startAt) < startOfToday);
  return events;
}

function Cards({ list }: { list: EventCard[] }) {
  return (
    <ul className="mt-4 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((e) => {
        const approvedCount = e.rsvps.filter(r => r.status === 'APPROVED').length;
        const maybeCount = e.rsvps.filter(r => r.status === 'MAYBE').length;
        const declinedCount = e.rsvps.filter(r => r.status === 'DECLINED').length;
        const totalCount = e.rsvps.length;
        const naCount = Math.max(0, totalCount - approvedCount - maybeCount - declinedCount);
        const iconType = e.holidayKey === 'shabat_eve' ? 'shabat_eve' : e.holidayKey?.includes('eve') ? 'holiday_eve' : e.holidayKey ? 'holiday' : 'custom';
        const href = `/events/${e.id}${e.recurrence ? `?occurrenceStartAt=${encodeURIComponent(e.startAt)}` : ''}`;
        return (
          <li key={e.id} className="list-none">
            <Link
              href={href}
              className="group block rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-xl transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={e.title}
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveEventTypeImage(e.holidayKey, e.title)} alt={e.title} className="w-full h-44 sm:h-40 object-cover transition-transform duration-300 sm:group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-90 pointer-events-none" />
                <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 pointer-events-none">
                  {formatDateMaybeDateOnly(e.startAt)}
                </div>
              </div>
              <div className="p-4 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EventTypeIcon type={iconType as any} size={20} />
                      <h3 className="font-semibold text-[1.05rem] sm:text-lg truncate" title={e.title}>{e.title}</h3>
                    </div>
                    {e.location && (
                      <p className="text-[0.8rem] sm:text-xs text-gray-600 dark:text-gray-400 inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        {e.location}
                      </p>
                    )}
                  </div>
                </div>
                {e.description && <p className="mt-2 text-[0.9rem] sm:text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{e.description}</p>}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.hostImage && /^https?:/i.test(e.hostImage) ? e.hostImage : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(e.host?.name || 'host')}`} alt="host" className="w-6 h-6 sm:w-5 sm:h-5 rounded-full" />
                    מארחים: {[e.host?.name, ...(e.coHosts || []).map(h => h.name)].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="flex h-full w-full">
                        {totalCount > 0 ? (
                          <>
                            {approvedCount > 0 && <div className="h-full bg-green-500" style={{ width: `${(approvedCount / totalCount) * 100}%` }} />}
                            {maybeCount > 0 && <div className="h-full bg-yellow-400" style={{ width: `${(maybeCount / totalCount) * 100}%` }} />}
                            {declinedCount > 0 && <div className="h-full bg-red-500" style={{ width: `${(declinedCount / totalCount) * 100}%` }} />}
                            {naCount > 0 && <div className="h-full bg-gray-300 dark:bg-gray-700" style={{ width: `${(naCount / totalCount) * 100}%` }} />}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {/* RSVP labels removed for mobile focus; details moved to event page */}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ApprovalSummary({ rsvps }: { rsvps: { status: string }[] }) {
  const approved = rsvps.filter(r => r.status === 'APPROVED').length;
  const maybe = rsvps.filter(r => r.status === 'MAYBE').length;
  const declined = rsvps.filter(r => r.status === 'DECLINED').length;
  const total = rsvps.length;
  const responded = approved + maybe + declined;
  return <span className="text-gray-600 dark:text-gray-400">{responded}/{total} השיבו</span>;
}

function resolveEventTypeImage(holidayKey?: string | null, title?: string | null) {
  const map: Record<string, string> = {
    holiday: '/templates/party.jpg',
    shabat_eve: '/templates/shishi-dinner.jpg',
    sukkot: '/templates/sukkot.jpg',
    hanukkah: '/templates/hanukkah.jpg',
    purim: '/templates/purim.jpg',
    passover: '/templates/passover.jpg',
  };
  if (holidayKey && map[holidayKey]) return map[holidayKey];
  const t = (title || '').toLowerCase();
  if (/שישי|שבת/.test(t)) return '/templates/shishi-dinner.jpg';
  if (/סוכות/.test(t)) return '/templates/sukkot.jpg';
  if (/חנוכ/.test(t)) return '/templates/hanukkah.jpg';
  if (/פורים/.test(t)) return '/templates/purim.jpg';
  if (/פסח/.test(t)) return '/templates/passover.jpg';
  return '/templates/party.jpg';
}

function formatDateMaybeDateOnly(iso: string) {
  // If stored as date-only, our API returns UTC midnight (..T00:00:00.000Z)
  if (/T00:00:00\.000Z$/.test(iso)) {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { dateStyle: 'full' });
  }
  const d = new Date(iso);
  return d.toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' });
}

