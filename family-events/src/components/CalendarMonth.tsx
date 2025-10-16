"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string; // ISO string
  location?: string | null;
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

export default function CalendarMonth({ events }: { events: CalendarEvent[] }) {
  const [cursor, setCursor] = useState<Date>(() => getStartOfMonth(new Date()));

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {cursor.toLocaleString("he-IL", { month: "long", year: "numeric" })}
        </div>
        <div className="flex gap-2">
          <button className="px-2 py-1 rounded border" onClick={() => setCursor((d) => addMonths(d, 1))}>◀</button>
          <button className="px-2 py-1 rounded border" onClick={() => setCursor(getStartOfMonth(new Date()))}>היום</button>
          <button className="px-2 py-1 rounded border" onClick={() => setCursor((d) => addMonths(d, -1))}>▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-white dark:bg-gray-900 p-2 text-xs font-medium text-center">
            {label}
          </div>
        ))}
        {days.map((d) => {
          const k = toKey(d.date);
          const list = byDay.get(k) || [];
          const isCurrentMonth = d.date.getMonth() === cursor.getMonth();
          return (
            <div key={k} className={["bg-white dark:bg-gray-900 min-h-[110px] p-2", isCurrentMonth ? "" : "opacity-50"].join(" ")}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{d.date.getDate()}</span>
                {list.length > 0 && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                    {list.length}
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {list.slice(0, 3).map((e) => (
                  <li key={e.id} className="truncate">
                    <Link href={`/events/${e.id}`} className="inline-block max-w-full truncate text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                      {new Date(e.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} · {e.title}
                    </Link>
                  </li>
                ))}
                {list.length > 3 && (
                  <li className="text-[11px] text-gray-500">+{list.length - 3} נוספים</li>
                )}
              </ul>
            </div>
          );
        })}
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
