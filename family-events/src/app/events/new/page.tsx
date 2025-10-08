"use client";
import { useMemo, useState, useEffect } from 'react';
import EventTypeIcon from '@/components/EventTypeIcon';
import DateTimePicker from '@/components/DateTimePicker';
import Script from 'next/script';

export default function NewEventPage() {
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });
  const [step, setStep] = useState<1 | 2>(1);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState('');
  const [skipHolidays, setSkipHolidays] = useState(true);
  const [saving, setSaving] = useState(false);
  const errors = useMemo(() => {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.title.trim()) errs.title = 'יש להזין כותרת';
    if (!form.startAt) errs.startAt = 'יש להזין תאריך התחלה';
    if (form.endAt && form.startAt && new Date(form.endAt) < new Date(form.startAt)) errs.endAt = 'תאריך הסיום חייב להיות אחרי ההתחלה';
    if (form.externalLink && !/^https?:\/\//.test(form.externalLink)) errs.externalLink = 'קישור לא תקין (חייב להתחיל ב-http/https)';
    return errs;
  }, [form]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const body: any = { ...form, holidayKey: (window as any).__holidayKey ?? null };
    if (repeatWeekly && repeatUntil) {
      body.repeat = { weeklyUntil: repeatUntil, skipHolidays };
    }
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      const { event } = await res.json();
      try {
        const base = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
        const shareUrl = `${base}/events/${event.id}`;
        const text = `🎉 נוצר אירוע חדש: ${form.title}\nאישור הגעה: ${shareUrl}`;
        if (navigator.share) await navigator.share({ text });
      } catch {}
      window.location.href = '/events';
    }
  }

  const inputCls = "w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800";
  const errorCls = "text-xs text-red-600";

  return (
    <main className="container-page space-y-4">
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=he`}
          strategy="afterInteractive"
        />
      )}
      <h1 className="text-2xl font-bold">אירוע חדש</h1>
      {step === 1 && (
      <TemplatesTiles onPick={(tpl)=>{
        setForm({
          title: tpl.title,
          description: tpl.description ?? '',
          location: tpl.location ?? '',
          startAt: tpl.startAt ?? '',
          endAt: tpl.endAt ?? '',
          externalLink: ''
        });
        (window as any).__holidayKey = tpl.holidayKey ?? null;
        setStep(2);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      }} />
      )}
      {step === 2 && (
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          {(!form.title || !form.title.trim()) && <div className="text-xs text-gray-500 mb-1">הזינו כותרת לאירוע</div>}
          <input className={inputCls} value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          {errors.title && <p className={errorCls}>{errors.title}</p>}
        </div>
        <div>
          {(!form.description || !form.description.trim()) && <div className="text-xs text-gray-500 mb-1">כמה מילים על האירוע</div>}
          <textarea rows={3} className={inputCls} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        </div>
        <PlacesInput value={form.location} onChange={(v)=>setForm({...form, location:v})} />
        <div>
          <DateTimePicker label="תאריך התחלה" value={form.startAt} onChange={(v)=>setForm({...form, startAt:v})} allowDateOnly timeToggle />
          {errors.startAt && <p className={errorCls}>{errors.startAt}</p>}
        </div>
        <div>
          <DateTimePicker label="תאריך סיום (אופציונלי)" value={form.endAt} onChange={(v)=>setForm({...form, endAt:v})} allowDateOnly timeToggle />
          {errors.endAt && <p className={errorCls}>{errors.endAt}</p>}
        </div>
        <div className="mt-4 space-y-2">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={repeatWeekly} onChange={(e)=>setRepeatWeekly(e.target.checked)} />
            <span>חזרה כל שבוע</span>
          </label>
          {repeatWeekly && (
            <div className="space-y-2">
              <DateTimePicker label="עד תאריך" value={repeatUntil} onChange={setRepeatUntil} />
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={skipHolidays} onChange={(e)=>setSkipHolidays(e.target.checked)} />
                <span>דלג על חגים</span>
              </label>
            </div>
          )}
        </div>
        <div>
          <input className={inputCls} placeholder="קישור חיצוני (אופציונלי)" value={form.externalLink} onChange={e=>setForm({...form, externalLink:e.target.value})} />
          {errors.externalLink && <p className={errorCls}>{errors.externalLink}</p>}
        </div>
        <GuestSelector />
        <button disabled={saving || Object.keys(errors).length > 0} onClick={()=>{}} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? 'שומר…' : 'שמירה'}</button>
      </form>
      )}
      {/* Holidays generator removed per request */}
    </main>
  );
}

type Template = { title: string; description?: string; location?: string; startAt?: string; endAt?: string; holidayKey?: string };

function TemplatesTiles({ onPick }: { onPick: (tpl: Template) => void }) {
  const now = new Date();
  const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const nextFriday = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7; // next Friday
    d.setDate(d.getDate() + diff);
    d.setHours(19,0,0,0);
    return d;
  })();
  const tonight = (()=>{ const d=new Date(now); d.setHours(19,0,0,0); return d; })();
  const nextWeek = (()=>{ const d=new Date(now); d.setDate(d.getDate()+7); d.setHours(12,0,0,0); return d; })();
  // Use DiceBear shapes as an avatar-like background, overlay a relevant emoji icon
  const bg = (seed: string) => `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc&backgroundType=gradientLinear&radius=50`;
  const random = () => Math.random().toString(36).slice(2,6);
  const categories: { key: 'dinners' | 'holidays' | 'outdoors' | 'other'; label: string }[] = [
    { key: 'dinners', label: 'ארוחות' },
    { key: 'holidays', label: 'חגים' },
    { key: 'outdoors', label: 'טיולים/ים' },
    { key: 'other', label: 'אחר' },
  ];
  const items: { cat: typeof categories[number]['key']; label: string; img: string; tpl: Template }[] = [
    // Holidays ordered starting from Rosh Hashanah
    { cat: 'holidays', label: 'ראש השנה', img: '/templates/rosh-hashanah.jpg', tpl: { title: 'ראש השנה', description: 'ארוחת חג משפחתית', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'יום כיפור', img: '/templates/kippur.jpg', tpl: { title: 'מוצאי יום כיפור', description: 'ארוחת מפסקת/נעילת צום', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'סוכות', img: '/templates/sukkot.jpg', tpl: { title: 'סוכות', description: 'ארוחה בסוכה', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'חנוכה', img: '/templates/hanukkah.jpg', tpl: { title: 'חנוכה', description: 'הדלקת נרות', startAt: toLocal(tonight), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'ט"ו בשבט', img: '/templates/tu-bishvat.jpg', tpl: { title: 'ט"ו בשבט', description: 'סדר פירות', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'פורים', img: '/templates/purim.jpg', tpl: { title: 'פורים', description: 'מסיבת תחפושות', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'פסח', img: '/templates/passover.jpg', tpl: { title: 'פסח', description: 'ליל הסדר משפחתי', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'שבועות', img: '/templates/shavout.jpg', tpl: { title: 'שבועות', description: 'ארוחת חג', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'ט"ו באב', img: '/templates/tu-beav.jpg', tpl: { title: 'ט"ו באב', description: 'מפגש משפחתי', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'ל"ג בעומר', img: '/templates/lag-baomer.jpg', tpl: { title: 'ל"ג בעומר', description: 'מדורה משפחתית', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    // Meals first in tabs; include lunch
    { cat: 'dinners', label: 'ערב שישי', img: '/templates/shishi-dinner.jpg', tpl: { title: 'ערב שישי', description: 'ארוחת שבת משפחתית', startAt: toLocal(nextFriday), holidayKey: 'shabat_eve' } },
    { cat: 'dinners', label: 'ארוחת צהריים', img: '/templates/dinner.jpg', tpl: { title: 'ארוחת צהריים', description: 'מפגש צהריים', startAt: toLocal(tonight) } },
    { cat: 'dinners', label: 'ארוחת ערב', img: '/templates/dinner.jpg', tpl: { title: 'ארוחת ערב', description: 'מפגש משפחתי', startAt: toLocal(tonight) } },
    { cat: 'dinners', label: 'ארוחת בוקר', img: '/templates/brekfast.jpg', tpl: { title: 'ארוחת בוקר', description: 'מפגש בוקר', startAt: toLocal(tonight) } },
    { cat: 'other', label: 'יום הולדת', img: '/templates/birthday.jpg', tpl: { title: 'מסיבת יום הולדת', description: 'חוגגים יום הולדת', startAt: toLocal(nextWeek) } },
    { cat: 'outdoors', label: 'פיקניק', img: '/templates/picnic.jpg', tpl: { title: 'פיקניק משפחתי', description: 'בפארק', startAt: toLocal(nextWeek) } },
    { cat: 'outdoors', label: 'ים', img: '/templates/beach.jpg', tpl: { title: 'ים', description: 'יום כיף בים', startAt: toLocal(nextWeek) } },
    { cat: 'outdoors', label: 'טיול', img: '/templates/party.jpg', tpl: { title: 'טיול', description: 'טיול משפחתי', startAt: toLocal(nextWeek) } },
    { cat: 'other', label: 'מסעדה', img: '/templates/resturant.jpg', tpl: { title: 'מסעדה', description: 'ארוחה במסעדה', startAt: toLocal(nextWeek) } },
    { cat: 'other', label: 'מותאם אישית', img: '/templates/party.jpg', tpl: { title: '', description: '', startAt: '' } },
  ];

  const [cat, setCat] = useState<'holidays' | 'birthdays' | 'dinners' | 'outdoors' | 'other'>('holidays');

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <button key={c.key} type="button" onClick={()=>setCat(c.key)} className={`px-3 py-1 rounded border text-sm ${cat===c.key?'bg-blue-600 text-white border-blue-600':'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.filter(i=>i.cat===cat).map((t)=> (
          <button type="button" key={t.label} onClick={()=>onPick(t.tpl)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-900 hover:shadow flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.img} alt="" className="w-32 h-24 object-cover rounded" />
            <div className="font-medium mt-2 text-sm text-center">{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlacesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  'use client';
  const [input, setInput] = useState(value);
  useEffect(() => { setInput(value); }, [value]);
  useEffect(() => {
    if (!(window as any).google || !(window as any).google.maps?.places) return;
    const el = document.getElementById('places-input') as HTMLInputElement | null;
    if (!el) return;
    const ac = new (window as any).google.maps.places.Autocomplete(el, { fields: ['formatted_address', 'name', 'geometry'] });
    ac.setFields(['formatted_address', 'name', 'geometry']);
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const text = (place?.name && place?.formatted_address) ? `${place.name}, ${place.formatted_address}` : (place?.formatted_address || place?.name || el.value);
      onChange(text || '');
      setInput(text || '');
    });
  }, [onChange]);
  return (
    <input id="places-input" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="מיקום" value={input} onChange={e=>{ setInput(e.target.value); onChange(e.target.value); }} />
  );
}

// Holidays generator removed per request

function GuestSelector() {
  'use client';
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; groupId: string | null } | null>(null);
  const [groups, setGroups] = useState<{ id: string; nickname: string; members: { id: string; name: string | null; image: string | null }[] }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const m = await fetch('/api/users/me');
        const mj = await m.json();
        setMe(mj.user);
        const g = await fetch('/api/family/groups');
        const gj = await g.json();
        setGroups(gj.groups || []);
        // Default: select everyone (placeholder; apply opt-outs here later)
        const sel: Record<string, boolean> = {};
        (gj.groups || []).forEach((gr: any) => gr.members.forEach((u: any) => { sel[u.id] = true; }));
        // Also select entire groups by default
        const sg: Record<string, boolean> = {};
        (gj.groups || []).forEach((gr: any) => { sg[gr.id] = true; });
        setSelected(sel);
        setSelectedGroups(sg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleUser(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }
  function toggleGroup(id: string, members: { id: string }[]) {
    setSelectedGroups((g) => ({ ...g, [id]: !g[id] }));
    const on = !selectedGroups[id];
    setSelected((s) => {
      const ns = { ...s };
      members.forEach((m) => { ns[m.id] = on; });
      return ns;
    });
  }

  useEffect(() => {
    // Serialize selection into hidden input for server
    const input = document.getElementById('guestSelection') as HTMLInputElement | null;
    if (!input) return;
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    input.value = JSON.stringify(ids);
  }, [selected]);

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-300">טוען קבוצות…</div>;
  if (!groups.length) return <div className="text-sm text-gray-600 dark:text-gray-300">אין קבוצות עדיין.</div>;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">מוזמנים</h3>
      <input type="hidden" id="guestSelection" name="guestSelection" />
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="rounded border border-gray-200 dark:border-gray-800 p-3">
            <label className="inline-flex items-center gap-2 mb-2">
              <input type="checkbox" checked={!!selectedGroups[g.id]} onChange={() => toggleGroup(g.id, g.members)} />
              <span className="font-medium">{g.nickname}</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.members.map((u) => (
                <label key={u.id} className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-sm ${selected[u.id] ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-700 dark:border-blue-700 dark:text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.image && u.image.startsWith('http') ? u.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(u.name || 'user')}`} alt={u.name || ''} className="w-5 h-5" />
                  <span>{u.name || ''}</span>
                  <input type="checkbox" className="ml-1" checked={!!selected[u.id]} onChange={() => toggleUser(u.id)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

