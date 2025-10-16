"use client";
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import EventsSearch, { EventItem } from '@/components/EventsSearch';
import CalendarMonth, { type CalendarEvent } from '@/components/CalendarMonth';

type EventCard = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  host: { name: string | null };
  hostId?: string | null;
  rsvps: { status: string; userId?: string }[];
};

type TabKey = 'today' | 'week' | 'month' | 'all';
type ScopeKey = 'mine' | 'all';
type ViewKey = 'list' | 'calendar';

export default function EventsExplorer({ initial }: { initial: EventCard[] }) {
  const [tab, setTab] = useState<TabKey>('today');
  const [scope, setScope] = useState<ScopeKey>('mine');
  const [view, setView] = useState<ViewKey>('list');
  const [groupId, setGroupId] = useState<string>('');
  const [myUserId, setMyUserId] = useState<string>('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // best-effort fetch to know current user id and group id
    (async () => {
      try {
        const r = await fetch('/api/users/me');
        const j = await r.json();
        setMyUserId(j?.user?.id || '');
        setGroupId(j?.user?.groupId || '');
      } catch {}
    })();
  }, []);
  const baseAll = useMemo(() => filterByTab(initial, tab), [initial, tab]);
  const base = useMemo(() => filterByScope(baseAll, scope, myUserId), [baseAll, scope, myUserId]);

  const items: EventItem[] = useMemo(
    () =>
      base.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startAt: e.startAt,
      })),
    [base]
  );

  const [filtered, setFiltered] = useState<EventCard[]>(base);
  const deferredBase = useDeferredValue(base);

  // Reset filtered when base changes (tab switch)
  useEffect(() => {
    setFiltered(deferredBase);
  }, [deferredBase]);

  // Initialize view from URL
  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    if (v === 'calendar') setView('calendar');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist view in URL (without scrolling)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (view === 'calendar') sp.set('view', 'calendar');
    else sp.delete('view');
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [view, router, pathname, searchParams]);

  const calItems: CalendarEvent[] = useMemo(
    () => filtered.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, location: e.location })),
    [filtered]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Tabs tab={tab} onChange={setTab} />
        <Scope scope={scope} onChange={setScope} />
        <GroupFilter onChange={(g)=>setGroupId(g)} />
        <ViewToggle view={view} onChange={setView} />
      </div>
      <EventsSearch
        items={items}
        onFilter={(f) => {
          const ids = new Set(f.map((x) => x.id));
          let next = base.filter((e) => ids.has(e.id));
          setFiltered(next);
        }}
      />
      {view === 'list' ? <Cards list={filtered} /> : <div className="mt-4"><CalendarMonth events={calItems} /></div>}
    </>
  );
}

function Tabs({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const btn = (key: TabKey, label: string) => (
    <button
      key={key}
      onClick={() => onChange(key)}
      className={[
        'px-3 py-1 rounded border text-sm',
        tab === key ? 'bg-blue-600 text-white border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
      ].join(' ')}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-4 flex gap-2">
      {btn('today', 'היום')}
      {btn('week', 'השבוע')}
      {btn('month', 'החודש')}
      {btn('all', 'הכל')}
    </div>
  );
}

function Scope({ scope, onChange }: { scope: ScopeKey; onChange: (s: ScopeKey) => void }) {
  const btn = (key: ScopeKey, label: string) => (
    <button
      key={key}
      onClick={() => onChange(key)}
      className={[
        'px-3 py-1 rounded border text-sm',
        scope === key ? 'bg-blue-600 text-white border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
      ].join(' ')}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2">
      {btn('mine', 'שלי')}
      {btn('all', 'כולם')}
    </div>
  );
}

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

function GroupFilter({ onChange }: { onChange: (groupId: string) => void }) {
  // placeholder: groups list is not in props; minimal UI for later wiring
  return (
    <select className="px-2 py-1 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm" onChange={(e)=>onChange(e.target.value)} defaultValue="">
      <option value="">כל הקבוצות</option>
    </select>
  );
}

function filterByTab(events: EventCard[], tab: TabKey): EventCard[] {
  if (tab === 'all') return events;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (tab === 'today') {
    return events.filter((e) => {
      const d = new Date(e.startAt);
      return d >= startOfToday && d <= endOfToday;
    });
  }
  if (tab === 'week') {
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setMilliseconds(endOfWeek.getMilliseconds() - 1);
    return events.filter((e) => {
      const d = new Date(e.startAt);
      return d >= startOfToday && d <= endOfWeek;
    });
  }
  // month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const endOfMonth = new Date(startOfNextMonth.getTime() - 1);
  return events.filter((e) => {
    const d = new Date(e.startAt);
    return d >= startOfMonth && d <= endOfMonth;
  });
}

function filterByScope(events: EventCard[], scope: ScopeKey, myUserId: string): EventCard[] {
  if (scope === 'all' || !myUserId) return events;
  return events.filter((e) => e.hostId === myUserId || e.rsvps.some((r) => r.userId === myUserId));
}

function Cards({ list }: { list: EventCard[] }) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((e) => (
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
            <a className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800" href={`/events/${e.id}`}>
              פרטים
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

