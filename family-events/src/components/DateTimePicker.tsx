"use client";
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  label?: string;
  value: string; // ISO-like string ("YYYY-MM-DDTHH:mm") or empty
  onChange: (next: string) => void;
  required?: boolean;
  allowDateOnly?: boolean; // when true, user can leave time empty
};

export default function DateTimePicker({ label, value, onChange, required, allowDateOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<number>(() => (value ? new Date(value).getMonth() : new Date().getMonth()));
  const [year, setYear] = useState<number>(() => (value ? new Date(value).getFullYear() : new Date().getFullYear()));
  const [time, setTime] = useState<string>(() => (value.includes('T') ? formatTime(new Date(value)) : ''));
  const selected = value ? new Date(value) : undefined;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const display = selected ? formatDisplay(selected, !!time) : '';

  function selectDay(d: number) {
    if (allowDateOnly && !time) {
      const dt = new Date(year, month, d, 0, 0, 0, 0);
      onChange(toLocalDateISO(dt));
      setOpen(false);
      return;
    }
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    const dt = new Date(year, month, d, hh, mm, 0, 0);
    onChange(toLocalISO(dt));
    setOpen(false);
  }

  function prevMonth() {
    const m = month - 1;
    if (m < 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth(m);
  }

  function nextMonth() {
    const m = month + 1;
    if (m > 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth(m);
  }

  function onTimeChange(v: string) {
    setTime(v);
    if (!v) {
      if (allowDateOnly && selected) {
        onChange(toLocalDateISO(selected));
      }
      return;
    }
    const [hh, mm] = v.split(':').map(Number);
    const base = selected ?? new Date(year, month, new Date().getDate());
    const dt = new Date(base);
    dt.setHours(hh, mm, 0, 0);
    onChange(toLocalISO(dt));
  }

  return (
    <div className="w-full" ref={ref} dir="rtl">
      {label && <label className="block text-sm text-gray-600 mb-1">{label}{required ? ' *' : ''}</label>}
      <button type="button" className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-right" onClick={() => setOpen((o) => !o)}>
        {display || 'בחר תאריך ושעה'}
      </button>
      {open && (
        <div className="mt-2 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-3 shadow z-50 relative">
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="px-2 py-1 border rounded" onClick={prevMonth}>‹</button>
            <div className="text-sm font-medium">{heMonths[month]} {year}</div>
            <button type="button" className="px-2 py-1 border rounded" onClick={nextMonth}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
            {heWeekdays.map((d) => (<div key={d} className="text-gray-500">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((cell, idx) => (
              <button
                key={idx}
                type="button"
                disabled={!cell.inMonth}
                onClick={() => selectDay(cell.day)}
                className={`px-2 py-1 rounded ${cell.inMonth ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'opacity-30'} ${selected && cell.inMonth && sameDate(selected, year, month, cell.day) ? 'bg-blue-600 text-white' : ''}`}
              >
                {cell.day}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <select dir="rtl" className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-right" value={time} onChange={(e) => onTimeChange(e.target.value)}>
              {allowDateOnly && <option value="">ללא שעה</option>}
              {buildTimes().map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // make Monday=0, Sunday=6 for RTL weeks if desired
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: { day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: prevDays - startDay + 1 + i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length, inMonth: false });
  return cells;
}

function formatTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(Math.round(d.getMinutes() / 15) * 15 % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDisplay(d: Date, withTime: boolean) {
  return withTime
    ? d.toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString('he-IL', { dateStyle: 'medium' });
}

function toLocalISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toLocalDateISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sameDate(a: Date, y: number, m: number, d: number) {
  return a.getFullYear() === y && a.getMonth() === m && a.getDate() === d;
}

const heMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const heWeekdays = ['ב׳','ג׳','ד׳','ה׳','ו׳','ש׳','א׳'];

function buildTimes() {
  const arr: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) arr.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  }
  return arr;
}

