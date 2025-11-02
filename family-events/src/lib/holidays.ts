export type HolidayEntry = { date: string; title: string };

export async function fetchIsraelHolidays(year: number): Promise<HolidayEntry[]> {
  try {
    const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&year=${year}&month=x&i=on&geo=geoname&lg=h&d=on&b=18&mf=on&ss=on&tz=Asia/Jerusalem`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const j = await res.json();
    const items = (j?.items || []) as any[];
    return items
      .filter((item) => item && typeof item === 'object' && item.category === 'holiday' && typeof item.date === 'string')
      .map((item) => ({ date: item.date as string, title: typeof item.title === 'string' ? item.title : '' }));
  } catch {
    return [];
  }
}

export function isHoliday(date: Date, holidays: HolidayEntry[]): boolean {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const iso = `${yyyy}-${mm}-${dd}`;
  return holidays.some((holiday) => typeof holiday.date === 'string' && holiday.date.startsWith(iso));
}

