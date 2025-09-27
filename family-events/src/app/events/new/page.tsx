"use client";
import { useMemo, useState } from 'react';

export default function NewEventPage() {
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });
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
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) {
      window.location.href = '/events';
    }
  }

  const inputCls = "w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800";
  const errorCls = "text-xs text-red-600";

  return (
    <main className="container-page space-y-4">
      <h1 className="text-2xl font-bold">אירוע חדש</h1>
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          <input className={inputCls} placeholder="כותרת" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          {errors.title && <p className={errorCls}>{errors.title}</p>}
        </div>
        <input className={inputCls} placeholder="תיאור" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <input className={inputCls} placeholder="מיקום" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
        <div>
          <input className={inputCls} placeholder="תאריך התחלה" type="datetime-local" value={form.startAt} onChange={e=>setForm({...form, startAt:e.target.value})} />
          {errors.startAt && <p className={errorCls}>{errors.startAt}</p>}
        </div>
        <div>
          <input className={inputCls} placeholder="תאריך סיום" type="datetime-local" value={form.endAt} onChange={e=>setForm({...form, endAt:e.target.value})} />
          {errors.endAt && <p className={errorCls}>{errors.endAt}</p>}
        </div>
        <div>
          <input className={inputCls} placeholder="קישור חיצוני (אופציונלי)" value={form.externalLink} onChange={e=>setForm({...form, externalLink:e.target.value})} />
          {errors.externalLink && <p className={errorCls}>{errors.externalLink}</p>}
        </div>
        <button disabled={saving || Object.keys(errors).length > 0} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? 'שומר…' : 'שמירה'}</button>
      </form>
    </main>
  );
}

