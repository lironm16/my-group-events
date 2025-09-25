"use client";
import { useState } from 'react';

export default function NewEventPage() {
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    window.location.href = '/events';
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">אירוע חדש</h1>
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <input className="w-full border p-2 rounded" placeholder="כותרת" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
        <input className="w-full border p-2 rounded" placeholder="תיאור" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <input className="w-full border p-2 rounded" placeholder="מיקום" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
        <input className="w-full border p-2 rounded" placeholder="תאריך התחלה" type="datetime-local" value={form.startAt} onChange={e=>setForm({...form, startAt:e.target.value})} />
        <input className="w-full border p-2 rounded" placeholder="תאריך סיום" type="datetime-local" value={form.endAt} onChange={e=>setForm({...form, endAt:e.target.value})} />
        <input className="w-full border p-2 rounded" placeholder="קישור חיצוני (אופציונלי)" value={form.externalLink} onChange={e=>setForm({...form, externalLink:e.target.value})} />
        <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">שמירה</button>
      </form>
    </main>
  );
}

