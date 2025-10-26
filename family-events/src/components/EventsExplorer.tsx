"use client";
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import EventsSearch, { EventItem } from '@/components/EventsSearch';
import CalendarMonth, { type CalendarEvent } from '@/components/CalendarMonth';
import EventTypeIcon from '@/components/EventTypeIcon';

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

export default function EventsExplorer({ initial }: { initial: EventCard[] }) {
  const [filterKey, setFilterKey] = useState<ScopeKey>('mine');
  const [view, setView] = useState<ViewKey>('list');
  const [timeKey, setTimeKey] = useState<TimeKey>('upcoming');
  const [myUserId, setMyUserId] = useState<string>('');
  const [groupOptions, setGroupOptions] = useState<{ id: string; nickname: string; memberIds: string[] }[]>([]);
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

  const items: EventItem[] = useMemo(
    () =>
      scoped.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startAt: e.startAt,
      })),
    [scoped]
  );

  const [filtered, setFiltered] = useState<EventCard[]>(scoped);
  const deferredScoped = useDeferredValue(scoped);

  // Reset filtered when base changes (tab switch)
  useEffect(() => {
    setFiltered(deferredScoped);
  }, [deferredScoped]);

  // Initialize view/filter from URL
  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    if (v === 'calendar') setView('calendar');
    const fk = searchParams.get('filter');
    if (fk === 'mine' || fk === 'all' || (fk && fk.startsWith('group:'))) setFilterKey(fk as ScopeKey);
    const tk = (searchParams.get('time') || '').toLowerCase();
    if (tk === 'today' || tk === 'week' || tk === 'month' || tk === 'past' || tk === 'upcoming') setTimeKey(tk as TimeKey);
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
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [view, filterKey, timeKey, router, pathname, searchParams]);

  const calItems: CalendarEvent[] = useMemo(
    () => filtered.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, location: e.location, occurrenceStartAt: e.recurrence ? e.startAt : undefined })),
    [filtered]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <GroupFilter value={filterKey} groups={groupOptions} onChange={(v)=>setFilterKey(v)} />
        <TimeFilter value={timeKey} onChange={setTimeKey} />
        <ViewToggle view={view} onChange={setView} />
      </div>
      <EventsSearch
        items={items}
        onFilter={(f) => {
          const ids = new Set(f.map((x) => x.id));
          let next = scoped.filter((e) => ids.has(e.id));
          setFiltered(next);
        }}
      />
      {view === 'list' ? <Cards list={filtered} /> : <div className="mt-4 animate-fade-in"><CalendarMonth events={calItems} /></div>}
    </>
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
    <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((e) => {
        const approved = e.rsvps.filter(r => r.status === 'APPROVED').length;
        const total = e.rsvps.length || 1;
        const ratio = Math.min(100, Math.round((approved / total) * 100));
        const iconType = e.holidayKey === 'shabat_eve' ? 'shabat_eve' : e.holidayKey?.includes('eve') ? 'holiday_eve' : e.holidayKey ? 'holiday' : 'custom';
        return (
          <li key={e.id} className="group rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5">
            <a href={`/events/${e.id}${e.recurrence ? `?occurrenceStartAt=${encodeURIComponent(e.startAt)}` : ''}`} className="block">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveEventTypeImage(e.holidayKey, e.title)} alt={e.title} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-90" />
                <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700">
                  {formatDateMaybeDateOnly(e.startAt)}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EventTypeIcon type={iconType as any} size={18} />
                      <h3 className="font-semibold text-lg truncate" title={e.title}>{e.title}</h3>
                    </div>
                    {e.location && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        {e.location}
                      </p>
                    )}
                  </div>
                </div>
                {e.description && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{e.description}</p>}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.hostImage && /^https?:/i.test(e.hostImage) ? e.hostImage : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(e.host?.name || 'host')}`} alt="host" className="w-5 h-5 rounded-full" />
                    מארחים: {[e.host?.name, ...(e.coHosts || []).map(h => h.name)].filter(Boolean).join(', ') || '—'}
                  </span>
                  <ApprovalSummary rsvps={e.rsvps} />
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-[width] duration-300" style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ApprovalSummary({ rsvps }: { rsvps: { status: string }[] }) {
  const approved = rsvps.filter((r) => r.status === 'APPROVED').length;
  const total = rsvps.length;
  return <span className="text-gray-600 dark:text-gray-400">{approved}/{total} אישרו</span>;
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

