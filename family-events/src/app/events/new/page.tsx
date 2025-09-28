"use client";
import { useMemo, useState } from 'react';
import EventTypeIcon from '@/components/EventTypeIcon';
import DateTimePicker from '@/components/DateTimePicker';

export default function NewEventPage() {
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });
  const [step, setStep] = useState<1 | 2>(1);
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
    const body = { ...form, holidayKey: (window as any).__holidayKey ?? null } as any;
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
      <h1 className="text-2xl font-bold">אירוע חדש</h1>
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
      }} />
      {step === 2 && (
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          <input className={inputCls} placeholder="כותרת" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          {errors.title && <p className={errorCls}>{errors.title}</p>}
        </div>
        <input className={inputCls} placeholder="תיאור" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <input className={inputCls} placeholder="מיקום" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
        <div>
          <DateTimePicker label="תאריך התחלה" value={form.startAt} onChange={(v)=>setForm({...form, startAt:v})} />
          {errors.startAt && <p className={errorCls}>{errors.startAt}</p>}
        </div>
        <div>
          <DateTimePicker label="תאריך סיום" value={form.endAt} onChange={(v)=>setForm({...form, endAt:v})} />
          {errors.endAt && <p className={errorCls}>{errors.endAt}</p>}
        </div>
        <div>
          <input className={inputCls} placeholder="קישור חיצוני (אופציונלי)" value={form.externalLink} onChange={e=>setForm({...form, externalLink:e.target.value})} />
          {errors.externalLink && <p className={errorCls}>{errors.externalLink}</p>}
        </div>
        <button disabled={saving || Object.keys(errors).length > 0} onClick={()=>{}} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? 'שומר…' : 'שמירה'}</button>
      </form>
      )}
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
  const tpls: { label: string; type: 'shabat_eve' | 'holiday_eve' | 'holiday' | 'custom'; bgUrl: string; tpl: Template }[] = [
    { label: 'ערב שישי', type: 'shabat_eve', bgUrl: bg(`Shabbat-${random()}`), tpl: { title: 'ערב שישי', description: 'ארוחת שבת משפחתית', startAt: toLocal(nextFriday), holidayKey: 'shabat_eve' } },
    { label: 'ערב חג', type: 'holiday_eve', bgUrl: bg(`HolidayEve-${random()}`), tpl: { title: 'ערב חג', description: 'מפגש ערב חג', startAt: toLocal(tonight), holidayKey: 'holiday_eve' } },
    { label: 'חג', type: 'holiday', bgUrl: bg(`Holiday-${random()}`), tpl: { title: 'חג', description: 'מפגש חג', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { label: 'מותאם אישית', type: 'custom', bgUrl: bg(`Custom-${random()}`), tpl: { title: '', description: '', startAt: '' } },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
      {tpls.map((t)=> (
        <button type="button" key={t.label} onClick={()=>onPick(t.tpl)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 hover:shadow flex flex-col items-center">
          <div className="relative w-32 h-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.bgUrl} alt="" className="absolute inset-0 w-full h-full rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center text-gray-800 dark:text-gray-100">
              <EventTypeIcon type={t.type} size={84} />
            </div>
          </div>
          <div className="font-medium mt-3 text-sm md:text-base">{t.label}</div>
        </button>
      ))}
    </div>
  );
}

