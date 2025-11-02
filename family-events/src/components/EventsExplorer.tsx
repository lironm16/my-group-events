"use client";
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  occurrenceStartAt?: string | null;
};

type ScopeKey = 'mine' | 'all' | `group:${string}`;
type ViewKey = 'list' | 'calendar';
type TimeKey = 'upcoming' | 'today' | 'week' | 'month' | 'past';
type RsvpKey = 'all' | 'going' | 'maybe' | 'declined' | 'pending';
type SortKey = 'startAsc' | 'startDesc' | 'titleAsc';
// Metric toggle removed from main page per request

type StatusBadge = { label: string; circleClass: string };

const DEFAULT_FILTER_KEY: ScopeKey = 'all';
const DEFAULT_TIME_KEY: TimeKey = 'upcoming';
const DEFAULT_RSVP_FILTER: RsvpKey = 'all';
const DEFAULT_SORT_KEY: SortKey = 'startAsc';

const TIME_OPTIONS: { key: TimeKey; label: string }[] = [
  { key: 'upcoming', label: 'הכל' },
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

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'startAsc', label: 'הקרובים קודם' },
  { key: 'startDesc', label: 'הרחוקים קודם' },
  { key: 'titleAsc', label: 'א-ת לפי שם אירוע' },
];

const isoToDateKey = (iso: string) => {
  const d = new Date(iso);
  return dateToKey(d);
};

const dateToKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatTimeLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (date.getHours() === 0 && date.getMinutes() === 0) return 'כל היום';
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

const getEffectiveStartAt = (event: EventCard) => event.occurrenceStartAt ?? event.startAt;
const getEffectiveStartDate = (event: EventCard) => new Date(getEffectiveStartAt(event));

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
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortOpen, setSortOpen] = useState(false);
  const [draftSortKey, setDraftSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const defaultMonth = useMemo(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, [today]);
  const [calendarInitialMonth, setCalendarInitialMonth] = useState<string>(defaultMonth);
  const [calendarSeed, setCalendarSeed] = useState(0);
  const calendarWasOpenRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (sortOpen) {
      setDraftSortKey(sortKey);
    }
  }, [sortOpen, sortKey]);

  const getGroupLabel = useCallback(
    (key: ScopeKey): string => {
      if (key === 'all') return 'כל האירועים';
      if (key === 'mine') return 'האירועים שלי';
      if (key.startsWith('group:')) {
        const id = key.slice('group:'.length);
        return groupOptions.find((g) => g.id === id)?.nickname ?? 'קבוצה';
      }
      return 'כל האירועים';
    },
    [groupOptions],
  );

  const getTimeLabel = useCallback((key: TimeKey): string => TIME_OPTIONS.find((opt) => opt.key === key)?.label ?? '', []);
  const getRsvpLabel = useCallback((key: RsvpKey): string => RSVP_OPTIONS.find((opt) => opt.key === key)?.label ?? '', []);

  const groupFilterOptions = useMemo(() => {
    const base: { key: ScopeKey; label: string }[] = [
      { key: DEFAULT_FILTER_KEY, label: 'כל האירועים' },
      { key: 'mine', label: 'האירועים שלי' },
    ];
    const extras = groupOptions.map((g) => ({ key: (`group:${g.id}` as ScopeKey), label: g.nickname || 'קבוצה' }));
    return base.concat(extras);
  }, [groupOptions]);

  const activeFilters = useMemo(() => {
    const items: { type: 'filter' | 'time' | 'rsvp' | 'sort'; value: string; label: string }[] = [];
    if (filterKey !== DEFAULT_FILTER_KEY) {
      items.push({ type: 'filter', value: filterKey, label: getGroupLabel(filterKey) });
    }
    if (timeKey !== DEFAULT_TIME_KEY) {
      items.push({ type: 'time', value: timeKey, label: getTimeLabel(timeKey) });
    }
    if (rsvpFilter !== DEFAULT_RSVP_FILTER) {
      items.push({ type: 'rsvp', value: rsvpFilter, label: getRsvpLabel(rsvpFilter) });
    }
    if (sortKey !== DEFAULT_SORT_KEY) {
      items.push({ type: 'sort', value: sortKey, label: SORT_OPTIONS.find((opt) => opt.key === sortKey)?.label ?? '' });
    }
    return items;
  }, [filterKey, timeKey, rsvpFilter, sortKey, getGroupLabel, getTimeLabel, getRsvpLabel]);

  const hasActiveFilters = activeFilters.length > 0;

  const handleClearChip = (type: 'filter' | 'time' | 'rsvp' | 'sort') => {
    if (type === 'filter') {
      setFilterKey(DEFAULT_FILTER_KEY);
      setDraftFilterKey(DEFAULT_FILTER_KEY);
    } else if (type === 'time') {
      setTimeKey(DEFAULT_TIME_KEY);
      setDraftTimeKey(DEFAULT_TIME_KEY);
    } else {
      if (type === 'rsvp') {
        setRsvpFilter(DEFAULT_RSVP_FILTER);
        setDraftRsvpFilter(DEFAULT_RSVP_FILTER);
      } else {
        setSortKey(DEFAULT_SORT_KEY);
        setDraftSortKey(DEFAULT_SORT_KEY);
      }
    }
  };

  const clearAllFilters = () => {
    setFilterKey(DEFAULT_FILTER_KEY);
    setTimeKey(DEFAULT_TIME_KEY);
    setRsvpFilter(DEFAULT_RSVP_FILTER);
    setSortKey(DEFAULT_SORT_KEY);
    setDraftFilterKey(DEFAULT_FILTER_KEY);
    setDraftTimeKey(DEFAULT_TIME_KEY);
    setDraftRsvpFilter(DEFAULT_RSVP_FILTER);
    setDraftSortKey(DEFAULT_SORT_KEY);
    setSortOpen(false);
  };
  const resetDraftFilters = () => {
    setDraftFilterKey(DEFAULT_FILTER_KEY);
    setDraftTimeKey(DEFAULT_TIME_KEY);
    setDraftRsvpFilter(DEFAULT_RSVP_FILTER);
  };
  const resetDraftSort = () => setDraftSortKey(DEFAULT_SORT_KEY);

  const openFilters = () => setFiltersOpen(true);
  const closeFilters = () => setFiltersOpen(false);
  const applyFilters = () => {
    setFilterKey(draftFilterKey);
    setTimeKey(draftTimeKey);
    setRsvpFilter(draftRsvpFilter);
    setFiltersOpen(false);
  };
  const openSort = () => setSortOpen(true);
  const closeSort = () => setSortOpen(false);
  const applySort = () => {
    setSortKey(draftSortKey);
    setSortOpen(false);
  };
  const openCalendarView = () => {
    setCalendarOpen(true);
    setView('calendar');
  };
  const closeCalendarView = () => {
    setCalendarOpen(false);
    setView('list');
  };
  const toggleCalendar = () => {
    if (calendarOpen) closeCalendarView();
    else openCalendarView();
  };
  const handleDaySelect = (dateKey: string) => {
    setSelectedDateKey(dateKey);
  };
  const baseAll = initial;
  const base = useMemo(() => filterByKey(baseAll, filterKey, myUserId, groupOptions), [baseAll, filterKey, myUserId, groupOptions]);
  const scoped = useMemo(() => filterByTime(base, timeKey), [base, timeKey]);
  const scopedByRsvp = useMemo(() => filterByRsvp(scoped, rsvpFilter, myUserId), [scoped, rsvpFilter, myUserId]);
  const searched = useMemo(() => filterBySearch(scopedByRsvp, searchQuery), [scopedByRsvp, searchQuery]);
  const sorted = useMemo(() => sortEvents(searched, sortKey), [searched, sortKey]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventCard[]>();
    for (const event of sorted) {
      const key = isoToDateKey(getEffectiveStartAt(event));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    for (const [, list] of map) list.sort((a, b) => +getEffectiveStartDate(a) - +getEffectiveStartDate(b));
    return map;
  }, [sorted]);
  const calendarEvents = useMemo<CalendarEvent[]>(() => sorted.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: getEffectiveStartAt(e),
    location: e.location,
    occurrenceStartAt: e.occurrenceStartAt ?? undefined,
  })), [sorted]);
  const selectedDayEvents = useMemo(() => selectedDateKey ? (eventsByDay.get(selectedDateKey) ?? []) : [], [selectedDateKey, eventsByDay]);
  const selectedDateDisplay = useMemo(() => {
    if (!selectedDateKey) return '';
    const parts = selectedDateKey.split('-').map((n) => Number(n));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '';
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: 'long' });
  }, [selectedDateKey]);
  const sortActive = sortOpen || sortKey !== DEFAULT_SORT_KEY;

  useEffect(() => {
    if (calendarOpen && !calendarWasOpenRef.current) {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setCalendarInitialMonth(monthStr);
      setCalendarSeed((token) => token + 1);
    }
    calendarWasOpenRef.current = calendarOpen;
  }, [calendarOpen]);

  useEffect(() => {
    if (!calendarOpen) return;
    const todayKey = dateToKey(new Date());
    if (eventsByDay.has(todayKey)) {
      setSelectedDateKey((prev) => (prev === todayKey ? prev : todayKey));
    } else {
      const iterator = eventsByDay.keys();
      const first = iterator.next();
      const nextKey = first.done ? null : first.value;
      setSelectedDateKey((prev) => (prev === nextKey ? prev : nextKey));
    }
  }, [calendarOpen, eventsByDay]);

  useEffect(() => {
    if (!calendarOpen) return;
    if (!listRef.current) return;
    try {
      listRef.current.scrollTop = 0;
    } catch {}
  }, [calendarOpen, selectedDateKey]);

  useEffect(() => {
    if (!calendarOpen) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const scrollY = window.scrollY;
    const body = document.body;
    const docEl = document.documentElement;
    const original = {
      bodyOverflow: body.style.overflow,
      htmlOverflow: docEl.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };
    body.style.overflow = 'hidden';
    docEl.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      body.style.overflow = original.bodyOverflow;
      docEl.style.overflow = original.htmlOverflow;
      body.style.position = original.bodyPosition;
      body.style.top = original.bodyTop;
      body.style.width = original.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [calendarOpen]);

  // Initialize view/filter from URL
  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    if (v === 'calendar') openCalendarView();
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

  return (
    <>
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleCalendar}
            aria-pressed={calendarOpen}
            className={[
              'inline-flex items-center justify-center h-10 w-10 rounded-md border shadow-sm transition-colors',
              calendarOpen
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            ].join(' ')}
            aria-label={calendarOpen ? 'סגור לוח שנה' : 'פתח לוח שנה'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 9h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-[220px]">
            <EventsSearch value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openFilters}
            className="inline-flex items-center gap-2 h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="פתח מסנני חיפוש"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16l-6 8v6l-4 2v-8z" />
            </svg>
            <span>סינון</span>
          </button>
          <button
            type="button"
            onClick={openSort}
            aria-pressed={sortActive}
            className={[
              'inline-flex items-center gap-2 h-10 rounded-md border px-3 text-sm shadow-sm transition-colors',
              sortActive
                ? 'border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:border-blue-500/60 dark:text-blue-300 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            ].join(' ')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 4l4-4 4 4" />
              <path d="M8 20l4 4 4-4" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="16" y1="8" x2="21" y2="8" />
              <line x1="16" y1="12" x2="19" y2="12" />
              <line x1="16" y1="16" x2="17" y2="16" />
            </svg>
            <span>מיון</span>
          </button>
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
      <Cards list={sorted} viewerId={myUserId} />
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
                onClick={resetDraftFilters}
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
      {sortOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeSort} />
          <div className="relative z-10 w-full max-w-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">מיון אירועים</h2>
              <button
                type="button"
                onClick={closeSort}
                aria-label="סגירת חלון"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {SORT_OPTIONS.map((opt) => {
                const active = draftSortKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDraftSortKey(opt.key)}
                    aria-pressed={active}
                    className={[
                      'w-full rounded-md border px-3 py-2 text-sm text-right transition-colors',
                      active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetDraftSort}
                className="text-sm text-red-600 dark:text-red-300 hover:underline"
              >
                ברירת מחדל
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeSort}
                  className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={applySort}
                  className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  החלה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {calendarOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closeCalendarView} />
          <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-white dark:bg-gray-950">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 pt-6">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {selectedDateDisplay ? `אירועים ל-${selectedDateDisplay}` : 'בחרו יום כדי לראות את האירועים' }
                </p>
              </div>
              <button
                type="button"
                onClick={closeCalendarView}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:text-gray-700 dark:hover:text-white shadow-sm"
                aria-label="סגירת חלון הלוח"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div
              className="mt-4 flex-none px-4 sm:px-6"
              onWheelCapture={(event) => {
                event.stopPropagation();
                event.preventDefault();
              }}
              onTouchMoveCapture={(event) => {
                event.stopPropagation();
                event.preventDefault();
              }}
            >
              <CalendarMonth
                key={`calendar-${calendarSeed}`}
                events={calendarEvents}
                initialMonth={calendarInitialMonth}
                onDaySelect={handleDaySelect}
                selectedDateKey={selectedDateKey ?? undefined}
              />
            </div>
            <div ref={listRef} className="mt-4 flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-6">
              {selectedDayEvents.length > 0 ? (
                <ul className="space-y-3">
                  {selectedDayEvents.map((event) => {
                    const occurrenceParam = event.occurrenceStartAt ? `?occurrenceStartAt=${encodeURIComponent(event.occurrenceStartAt)}` : '';
                    const href = `/events/${event.id}${occurrenceParam}`;
                    const effectiveStartISO = getEffectiveStartAt(event);
                    return (
                      <li key={`${event.id}:${effectiveStartISO}`}>
                        <Link
                          href={href}
                          className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-md transition"
                        >
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-300">{formatTimeLabel(effectiveStartISO)}</div>
                          <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{event.title}</div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-10 text-sm text-gray-500 dark:text-gray-400">
                  אין אירועים בתאריך זה
                </div>
              )}
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
      className="back-to-top-btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-600 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all hover:-translate-y-0.5"
      aria-label="חזרה לראש הדף"
      onClick={() => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {} }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 12l5-5 5 5" />
        <line x1="12" y1="7" x2="12" y2="19" />
      </svg>
    </button>
  );
}

// Time tabs removed

function sortEvents(events: EventCard[], key: SortKey): EventCard[] {
  const list = events.slice();
  if (key === 'startAsc') {
    return list.sort((a, b) => +getEffectiveStartDate(a) - +getEffectiveStartDate(b));
  }
  if (key === 'startDesc') {
    return list.sort((a, b) => +getEffectiveStartDate(b) - +getEffectiveStartDate(a));
  }
  if (key === 'titleAsc') {
    return list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'he')); 
  }
  return list;
}

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
    const effectiveStart = getEffectiveStartDate(event);
    const fields = [
      event.title,
      event.description ?? '',
      event.location ?? '',
      event.host?.name ?? '',
      ...(event.coHosts || []).map((h) => h.name ?? ''),
      effectiveStart.toLocaleDateString('he-IL'),
      effectiveStart.toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' }),
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

  if (key === 'upcoming') return events.filter(e => getEffectiveStartDate(e) >= now);
  if (key === 'today') return events.filter(e => {
    const d = getEffectiveStartDate(e);
    return d >= startOfToday && d <= endOfToday;
  });
  if (key === 'week') return events.filter(e => {
    const d = getEffectiveStartDate(e);
    return d >= startOfToday && d <= endOfWeek;
  });
  if (key === 'month') return events.filter(e => {
    const d = getEffectiveStartDate(e);
    return d >= startOfToday && d <= endOfMonth;
  });
  if (key === 'past') return events.filter(e => getEffectiveStartDate(e) < now);
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
        const effectiveStartISO = getEffectiveStartAt(e);
        const occurrenceParam = e.occurrenceStartAt ? `?occurrenceStartAt=${encodeURIComponent(e.occurrenceStartAt)}` : '';
        const href = `/events/${e.id}${occurrenceParam}`;
        const viewerStatus = resolveViewerStatus(e, viewerId);
        const badge = resolveStatusBadge(viewerStatus);
        return (
          <li key={`${e.id}:${effectiveStartISO}`} className="list-none">
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
                  {formatDateMaybeDateOnly(effectiveStartISO)}
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

