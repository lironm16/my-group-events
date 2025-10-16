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
  hostImage?: string | null;
  rsvps: { status: string; userId?: string }[];
};

type ScopeKey = 'mine' | 'all' | `group:${string}`;
type ViewKey = 'list' | 'calendar';

export default function EventsExplorer({ initial }: { initial: EventCard[] }) {
  const [filterKey, setFilterKey] = useState<ScopeKey>('mine');
  const [view, setView] = useState<ViewKey>('list');
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

  // Initialize view/filter from URL
  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    if (v === 'calendar') setView('calendar');
    const fk = searchParams.get('filter');
    if (fk === 'mine' || fk === 'all' || (fk && fk.startsWith('group:'))) setFilterKey(fk as ScopeKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist view+filter in URL (without scrolling)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (view === 'calendar') sp.set('view', 'calendar');
    else sp.delete('view');
    if (filterKey) sp.set('filter', filterKey);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [view, filterKey, router, pathname, searchParams]);

  const calItems: CalendarEvent[] = useMemo(
    () => filtered.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, location: e.location })),
    [filtered]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <GroupFilter value={filterKey} groups={groupOptions} onChange={(v)=>setFilterKey(v)} />
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

// Time tabs removed

function filterByKey(events: EventCard[], key: ScopeKey, myUserId: string, groups: { id: string; memberIds: string[] }[]): EventCard[] {
  if (!myUserId) return events;
  if (key === 'all') return events;
  if (key === 'mine') return events.filter((e) => e.hostId === myUserId || e.rsvps.some((r) => r.userId === myUserId));
  if (key.startsWith('group:')) {
    const gid = key.slice('group:'.length);
    const group = groups.find((g) => g.id === gid);
    if (!group) return events;
    const set = new Set<string>([...group.memberIds]);
    return events.filter((e) => e.hostId && set.has(e.hostId) || e.rsvps.some((r) => r.userId && set.has(r.userId!)));
  }
  return events;
}

function Cards({ list }: { list: EventCard[] }) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((e) => (
        <li key={e.id} className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow transition-shadow">
          <a href={`/events/${e.id}`} className="block p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">{e.title}</h3>
                {e.location && <p className="text-sm text-gray-600 dark:text-gray-400">{e.location}</p>}
              </div>
              <span className="text-xs text-gray-500">{new Date(e.startAt).toLocaleString('he-IL')}</span>
            </div>
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(() => {
                  const img = e.hostImage as string | undefined | null;
                  if (img && /^https?:/i.test(img)) return img;
                  const seed = encodeURIComponent(e.host?.name || e.title || 'event');
                  return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc&backgroundType=gradientLinear&radius=50`;
                })()}
                alt={e.title}
                className="w-full h-36 object-cover rounded"
              />
            </div>
            {e.description && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{e.description}</p>}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">מארח: {e.host?.name ?? '—'}</span>
              <span className="text-gray-600 dark:text-gray-400">אישורים: {e.rsvps.length}</span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

