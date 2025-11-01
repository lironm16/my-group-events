"use client";
import { useMemo, useState } from "react";

export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string; // ISO string
  location?: string | null;
  occurrenceStartAt?: string; // if this is a virtual occurrence
};

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarMonth({ events, initialMonth, onMonthChange, onDaySelect, selectedDateKey }: { events: CalendarEvent[]; initialMonth?: string; onMonthChange?: (month: string) => void; onDaySelect?: (dateKey: string, events: CalendarEvent[]) => void; selectedDateKey?: string }) {
  const [cursor, setCursor] = useState<Date>(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) {
      const [y, m] = initialMonth.split('-').map(Number);
      return new Date(y, (m as number) - 1, 1);
    }
    return getStartOfMonth(new Date());
  });

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.startAt);
      const k = toKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    for (const [, list] of map) list.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    return map;
  }, [events]);

  // notify month changes
  useMemo(() => {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    onMonthChange && onMonthChange(`${y}-${m}`);
    return undefined;
  }, [cursor, onMonthChange]);

  const interactive = typeof onDaySelect === 'function';
  const selectedKey = selectedDateKey ?? null;
  const todayKey = toKey(new Date());

  const ensureVisibleMonth = (targetKey: string) => {
    if (!targetKey || targetKey.length < 7) return;
    const [year, month] = targetKey.split('-').map(Number);
    if (Number.isNaN(year) || Number.isNaN(month)) return;
    const currentYear = cursor.getFullYear();
    const currentMonth = cursor.getMonth() + 1;
    if (year === currentYear && month === currentMonth) return;
    setCursor(new Date(year, month - 1, 1));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-3 sm:px-6">
        <div className="text-lg font-semibold">
          {cursor.toLocaleString("he-IL", { month: "long", year: "numeric" })}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-transform"
            aria-label="חודש קודם"
            onClick={() => setCursor((d) => addMonths(d, -1))}
          >
            <ArrowIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              const today = new Date();
              setCursor(getStartOfMonth(today));
              onDaySelect?.(todayKey, byDay.get(todayKey) || []);
            }}
          >
            היום
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-transform"
            aria-label="חודש הבא"
            onClick={() => setCursor((d) => addMonths(d, 1))}
          >
            <ArrowIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!interactive && (
      <div className="block sm:hidden px-3 sm:px-6">
        <div className="relative">
          {days.filter(d => d.date.getMonth() === cursor.getMonth()).map((d) => {
            const k = toKey(d.date);
            const list = byDay.get(k) || [];
            if (list.length === 0) return null;
            const isToday = (() => { const n=new Date(); return n.toDateString()===d.date.toDateString(); })();
            return (
              <section key={k} className="mb-3">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-baseline justify-between">
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {d.date.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    {isToday && <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">היום</span>}
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">{list.length}</span>
                </div>
                <ul className="px-3 py-2 space-y-2">
                  {list.map((e) => (
                    <li key={`${e.id}:${e.startAt}`}>
                      <a href={`/events/${e.id}?from=${encodeURIComponent(`/events?view=calendar&month=${String(cursor.getFullYear())}-${String(cursor.getMonth()+1).padStart(2,'0')}`)}${e.occurrenceStartAt ? `&occurrenceStartAt=${encodeURIComponent(e.occurrenceStartAt)}` : ''}`} className="block rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">{new Date(e.startAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm leading-snug text-gray-900 dark:text-gray-100 whitespace-normal break-words">{e.title}</div>
                        {e.location && <div className="text-xs text-gray-500 mt-0.5">{e.location}</div>}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      )}
      <div className={interactive ? 'px-3 sm:px-6 grid grid-cols-7 gap-2 text-xs sm:text-sm' : 'hidden sm:block sm:mx-0'}>
        {interactive ? (
          <>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="p-2 bg-white dark:bg-gray-900 rounded-md text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
                {label}
              </div>
            ))}
            {days.map((d) => {
              const k = toKey(d.date);
              const list = byDay.get(k) || [];
              const isCurrentMonth = d.date.getMonth() === cursor.getMonth();
              const active = selectedKey === k;
              const isToday = k === todayKey;
              const hasEvents = list.length > 0;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    ensureVisibleMonth(k);
                    onDaySelect?.(k, list);
                  }}
                  aria-pressed={active}
                  className={[
                    'relative min-h-[48px] sm:min-h-[68px] rounded-lg border transition-colors p-2 flex items-center justify-center',
                    isCurrentMonth ? '' : 'opacity-60',
                    active
                      ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700 bg-blue-100/70 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100'
                      : hasEvents
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-100',
                    !active && !hasEvents ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : '',
                    !active && isToday ? 'border-2 border-blue-300 dark:border-blue-600' : active ? '' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
                  ].join(' ')}
                >
                  <span className="text-sm sm:text-base font-semibold">
                    {d.date.getDate()}
                  </span>
                </button>
              );
            })}
          </>
        ) : (
          <div className="min-w-[840px] grid grid-cols-7 sm:gap-px gap-[1px] bg-gray-200 dark:bg-gray-800 rounded overflow-hidden text-xs sm:text-sm">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="bg-white dark:bg-gray-900 p-2 text-xs font-medium text-center">
                {label}
              </div>
            ))}
            {days.map((d) => {
              const k = toKey(d.date);
              const list = byDay.get(k) || [];
              const isCurrentMonth = d.date.getMonth() === cursor.getMonth();
              const isToday = k === todayKey;
              return (
                <div
                  key={k}
                  className={[
                    'min-h-[64px] sm:min-h-[88px] p-1 sm:p-2 border rounded-md',
                    isCurrentMonth ? '' : 'opacity-50',
                    isToday ? 'border-blue-200 dark:border-blue-600' : 'border-transparent',
                    list.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200'
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-xs text-gray-500">{d.date.getDate()}</span>
                  </div>
                  <ul className="space-y-0.5 sm:space-y-1">
                    {list.slice(0, 3).map((e) => (
                      <li key={`${e.id}:${e.startAt}`} className="truncate">
                        <a href={`/events/${e.id}?from=${encodeURIComponent(`/events?view=calendar&month=${String(cursor.getFullYear())}-${String(cursor.getMonth()+1).padStart(2,'0')}`)}${e.occurrenceStartAt ? `&occurrenceStartAt=${encodeURIComponent(e.occurrenceStartAt)}` : ''}`} className="block w-full truncate text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                          {new Date(e.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} · {e.title}
                        </a>
                      </li>
                    ))}
                    {list.length > 3 && (
                      <li className="text-[10px] sm:text-[11px] text-gray-500">+{list.length - 3} נוספים</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const WEEKDAY_LABELS = [
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ש",
];

function buildMonthGrid(anchor: Date) {
  const start = getStartOfMonth(anchor);
  const firstDayOfWeek = 0; // Sunday
  const startWeekday = (start.getDay() - firstDayOfWeek + 7) % 7;
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - startWeekday);
  const days: { date: Date }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({ date: d });
  }
  return days;
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
