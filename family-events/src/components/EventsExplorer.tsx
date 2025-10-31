"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
type RsvpKey = 'all' | 'going' | 'maybe' | 'declined' | 'pending';
// Metric toggle removed from main page per request

type StatusBadge = { label: string; circleClass: string };

const DEFAULT_FILTER_KEY: ScopeKey = 'mine';
const DEFAULT_TIME_KEY: TimeKey = 'upcoming';
const DEFAULT_RSVP_FILTER: RsvpKey = 'all';

const TIME_OPTIONS: { key: TimeKey; label: string }[] = [
  { key: 'upcoming', label: 'קרובים' },
  { key: 'today', label: 'היום' },
  { key: 'week', label: 'השבוע' },
  { key: 'month', label: 'החודש' },
  { key: 'past', label: 'עבר' },
];

const RSVP_OPTIONS: { key: RsvpKey; label: string }[] = [
  { key: 'all', label: 'כל הסטטוסים' },
  { key: 'going', label: 'אגיע' },
  { key: 'maybe', label: 'אולי' },
  { key: 'declined', label: 'לא אגיע' },
  { key: 'pending', label: 'ממתין לתשובה' },
];

export default function EventsExplorer({ initial }: { initial: EventCard[] }) {
  const [filterKey, setFilterKey] = useState<ScopeKey>(DEFAULT_FILTER_KEY);
  const [view, setView] = useState<ViewKey>('list');
  const [timeKey, setTimeKey] = useState<TimeKey>(DEFAULT_TIME_KEY);
  const [myUserId, setMyUserId] = useState<string>('');
  const [groupOptions, setGroupOptions] = useState<{ id: string; nickname: string; memberIds: string[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<RsvpKey>(DEFAULT_RSVP_FILTER);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilterKey, setDraftFilterKey] = useState<ScopeKey>(DEFAULT_FILTER_KEY);
  const [draftTimeKey, setDraftTimeKey] = useState<TimeKey>(DEFAULT_TIME_KEY);
  const [draftRsvpFilter, setDraftRsvpFilter] = useState<RsvpKey>(DEFAULT_RSVP_FILTER);
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
  useEffect(() => {
    if (filtersOpen) {
      setDraftFilterKey(filterKey);
      setDraftTimeKey(timeKey);
      setDraftRsvpFilter(rsvpFilter);
    }
  }, [filtersOpen, filterKey, timeKey, rsvpFilter]);

  const getGroupLabel = (key: ScopeKey): string => {
    if (key === 'mine') return 'האירועים שלי';
    if (key === 'all') return 'כל האירועים';
    if (key.startsWith('group:')) {
      const id = key.slice('group:'.length);
      return groupOptions.find((g) => g.id === id)?.nickname ?? 'קבוצה';
    }
    return 'האירועים שלי';
  };

  const getTimeLabel = (key: TimeKey): string => TIME_OPTIONS.find((opt) => opt.key === key)?.label ?? '';
  const getRsvpLabel = (key: RsvpKey): string => RSVP_OPTIONS.find((opt) => opt.key === key)?.label ?? '';

  const groupFilterOptions = useMemo(() => {
    const base: { key: ScopeKey; label: string }[] = [
      { key: DEFAULT_FILTER_KEY, label: 'כל האירועים' },
      { key: 'mine', label: 'האירועים שלי' },
    ];
    const extras = groupOptions.map((g) => ({ key: (`group:${g.id}` as ScopeKey), label: g.nickname || 'קבוצה' }));
    return base.concat(extras);
  }, [groupOptions]);

  const activeFilters = useMemo(() => {
    const items: { type: 'filter' | 'time' | 'rsvp'; value: string; label: string }[] = [];
    if (filterKey !== DEFAULT_FILTER_KEY) {
      items.push({ type: 'filter', value: filterKey, label: getGroupLabel(filterKey) });
    }
    if (timeKey !== DEFAULT_TIME_KEY) {
      items.push({ type: 'time', value: timeKey, label: getTimeLabel(timeKey) });
    }
    if (rsvpFilter !== DEFAULT_RSVP_FILTER) {
      items.push({ type: 'rsvp', value: rsvpFilter, label: getRsvpLabel(rsvpFilter) });
    }
    return items;
  }, [filterKey, timeKey, rsvpFilter, groupOptions]);

  const hasActiveFilters = activeFilters.length > 0;

  const handleClearChip = (type: 'filter' | 'time' | 'rsvp') => {
    if (type === 'filter') {
      setFilterKey(DEFAULT_FILTER_KEY);
      setDraftFilterKey(DEFAULT_FILTER_KEY);
    } else if (type === 'time') {
      setTimeKey(DEFAULT_TIME_KEY);
      setDraftTimeKey(DEFAULT_TIME_KEY);
    } else {
      setRsvpFilter(DEFAULT_RSVP_FILTER);
      setDraftRsvpFilter(DEFAULT_RSVP_FILTER);
    }
  };

  const clearAllFilters = () => {
    setFilterKey(DEFAULT_FILTER_KEY);
    setTimeKey(DEFAULT_TIME_KEY);
    setRsvpFilter(DEFAULT_RSVP_FILTER);
    setDraftFilterKey(DEFAULT_FILTER_KEY);
    setDraftTimeKey(DEFAULT_TIME_KEY);
    setDraftRsvpFilter(DEFAULT_RSVP_FILTER);
  };

  const openFilters = () => setFiltersOpen(true);
  const closeFilters = () => setFiltersOpen(false);
  const applyFilters = () => {
    setFilterKey(draftFilterKey);
    setTimeKey(draftTimeKey);
    setRsvpFilter(draftRsvpFilter);
    setFiltersOpen(false);
  };
  const clearAllAndClose = () => {
    clearAllFilters();
    setFiltersOpen(false);
  };
  const baseAll = initial;
  const base = useMemo(() => filterByKey(baseAll, filterKey, myUserId, groupOptions), [baseAll, filterKey, myUserId, groupOptions]);
  const scoped = useMemo(() => filterByTime(base, timeKey), [base, timeKey]);
  const scopedByRsvp = useMemo(() => filterByRsvp(scoped, rsvpFilter, myUserId), [scoped, rsvpFilter, myUserId]);
  const filtered = useMemo(() => filterBySearch(scopedByRsvp, searchQuery), [scopedByRsvp, searchQuery]);

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
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openFilters}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="פתח מסנני חיפוש"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16l-6 8v6l-4 2v-8z" />
            </svg>
          </button>
          <div className="flex-1 min-w-[220px]">
            <EventsSearch value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((item) => (
              <button
                key={`${item.type}-${item.value}`}
                type="button"
                onClick={() => handleClearChip(item.type)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 px-2 py-1 text-xs"
              >
                <span>{item.label}</span>
                <span aria-hidden="true">×</span>
                <span className="sr-only">הסר מסנן {item.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-blue-600 dark:text-blue-300 hover:underline"
            >
              נקה הכל
            </button>
          </div>
        )}
      </div>
      {view === 'list' ? (
        <Cards list={filtered} viewerId={myUserId} />
      ) : (
        <div className="mt-4 animate-fade-in"><CalendarMonth events={calItems} /></div>
      )}
      <BackToTop />
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeFilters} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">מסנני חיפוש</h2>
              <button
                type="button"
                onClick={closeFilters}
                aria-label="סגירת חלון"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="filter-group-select">קבוצה</label>
                <select
                  id="filter-group-select"
                  className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900 text-sm"
                  value={draftFilterKey}
                  onChange={(e) => setDraftFilterKey(e.target.value as ScopeKey)}
                >
                  {groupFilterOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">טווח זמן</div>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_OPTIONS.map((opt) => {
                    const active = draftTimeKey === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setDraftTimeKey(opt.key)}
                        aria-pressed={active}
                        className={[
                          'rounded-md border px-3 py-2 text-sm transition-colors',
                          active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">סטטוס RSVP</div>
                <div className="grid grid-cols-2 gap-2">
                  {RSVP_OPTIONS.map((opt) => {
                    const active = draftRsvpFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setDraftRsvpFilter(opt.key)}
                        aria-pressed={active}
                        className={[
                          'rounded-md border px-3 py-2 text-sm transition-colors',
                          active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearAllAndClose}
                className="text-sm text-red-600 dark:text-red-300 hover:underline"
              >
                נקה הכל
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeFilters}
                  className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  החלה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <div className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1">
      <button
        onClick={() => onChange('list')}
        title="תצוגת רשימה"
        aria-label="תצוגת רשימה"
        className={[
          'px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors',
          view === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
        ].join(' ')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        רשימה
      </button>
      <button
        onClick={() => onChange('calendar')}
        title="תצוגת לוח שנה"
        aria-label="תצוגת לוח שנה"
        className={[
          'px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors',
          view === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
        ].join(' ')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 9h18" />
        </svg>
        לוח שנה
      </button>
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
  if (key === 'all') return events;
  if (key === 'mine') {
    if (!myUserId) return events;
    return events.filter((e) => e.hostId === myUserId || e.rsvps.some((r) => r.userId === myUserId));
  }
  if (key.startsWith('group:')) {
    const gid = key.slice('group:'.length);
    const group = groups.find((g) => g.id === gid);
    if (!group) return events;
    const set = new Set<string>(group.memberIds);
    return events.filter((e) => {
      const hostHit = !!e.hostId && set.has(e.hostId);
      const coHostsHit = (e.coHosts || []).some((h) => !!h.id && set.has(h.id));
      const rsvpHit = e.rsvps.some((r) => !!r.userId && set.has(r.userId));
      return hostHit || coHostsHit || rsvpHit;
    });
  }
  return events;
}

function filterByRsvp(events: EventCard[], key: RsvpKey, myUserId: string): EventCard[] {
  if (key === 'all' || !myUserId) return events;
  return events.filter((event) => {
    const myStatus = resolveViewerStatus(event, myUserId);
    if (key === 'going') return myStatus === 'APPROVED';
    if (key === 'maybe') return myStatus === 'MAYBE';
    if (key === 'declined') return myStatus === 'DECLINED';
    if (key === 'pending') return myStatus === 'NA';
    return true;
  });
}

function filterBySearch(events: EventCard[], query: string): EventCard[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return events;
  return events.filter((event) => {
    const fields = [
      event.title,
      event.description ?? '',
      event.location ?? '',
      event.host?.name ?? '',
      ...(event.coHosts || []).map((h) => h.name ?? ''),
      new Date(event.startAt).toLocaleDateString('he-IL'),
      new Date(event.startAt).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' }),
    ];
    return fields.some((field) => normalizeQuery(field).includes(normalized));
  });
}

function normalizeQuery(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return trimmed.normalize('NFKD').toLocaleLowerCase('he-IL');
  } catch {
    return trimmed.toLocaleLowerCase('he-IL');
  }
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

function Cards({ list, viewerId }: { list: EventCard[]; viewerId: string }) {
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
        const viewerStatus = resolveViewerStatus(e, viewerId);
        const badge = resolveStatusBadge(viewerStatus);
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
                {badge && (
                  <span
                    className={`absolute top-2 left-2 h-4 w-4 rounded-full border border-white/70 shadow-sm pointer-events-none ${badge.circleClass}`}
                    title={badge.label}
                    aria-label={badge.label}
                  />
                )}
                <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 pointer-events-none">
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

function resolveViewerStatus(event: EventCard, viewerId: string): 'APPROVED' | 'MAYBE' | 'DECLINED' | 'NA' {
  if (!viewerId) return 'NA';
  const status = event.rsvps.find((r) => r.userId === viewerId)?.status;
  if (status === 'APPROVED' || status === 'MAYBE' || status === 'DECLINED') return status;
  return 'NA';
}

function resolveStatusBadge(status: 'APPROVED' | 'MAYBE' | 'DECLINED' | 'NA'): StatusBadge {
  const map: Record<typeof status, StatusBadge> = {
    APPROVED: { label: 'אגיע', circleClass: 'bg-green-500 dark:bg-green-400' },
    MAYBE: { label: 'אולי', circleClass: 'bg-amber-400 dark:bg-amber-300' },
    DECLINED: { label: 'לא אגיע', circleClass: 'bg-red-500 dark:bg-red-400' },
    NA: { label: 'ממתין לתשובה', circleClass: 'bg-slate-400 dark:bg-slate-500' },
  };
  return map[status];
}

