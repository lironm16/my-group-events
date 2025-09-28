"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DateTimePicker from '@/components/DateTimePicker';

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  externalLink: string | null;
};

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/events/${params.id}`, { cache: 'no-store' });
      if (!res.ok) {
        setError('אין הרשאה לערוך או שהאירוע לא נמצא');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const e: EventDetail = data.event;
      setForm({
        title: e.title,
        description: e.description ?? '',
        location: e.location ?? '',
        startAt: e.startAt ? new Date(e.startAt).toISOString().slice(0,16) : '',
        endAt: e.endAt ? new Date(e.endAt).toISOString().slice(0,16) : '',
        externalLink: e.externalLink ?? '',
      });
      setLoading(false);
    })();
  }, [params.id]);

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
    const res = await fetch(`/api/events/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) router.push(`/events/${params.id}`);
  }

  if (loading) return <main className="container-page">טוען…</main>;
  if (error) return <main className="container-page text-red-600">{error}</main>;

  const inputCls = "w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800";
  const errorCls = "text-xs text-red-600";

  return (
    <main className="container-page space-y-4">
      <h1 className="text-2xl font-bold">עריכת אירוע</h1>
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
        <div className="flex gap-2">
          <button disabled={saving || Object.keys(errors).length > 0} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? 'שומר…' : 'שמירה'}</button>
          <button type="button" onClick={()=>router.push(`/events/${params.id}`)} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">ביטול</button>
        </div>
      </form>
    </main>
  );
}

