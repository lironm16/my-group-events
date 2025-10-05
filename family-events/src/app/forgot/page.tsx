"use client";
import { useState } from 'react';

export default function ForgotPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(null);
    const value = identifier.trim();
    if (!value) { setError('נא להזין שם משתמש או כינוי'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: value }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'שליחה נכשלה, נסו שוב');
        return;
      }
      const j = await res.json();
      setSent(j.link ?? '');
    } catch {
      setError('שגיאת רשת, נסו שוב');
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">שכחת סיסמה</h1>
      <form onSubmit={submit} className="space-y-2">
        <input autoComplete="username" className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 appearance-none" placeholder="שם משתמש / כינוי" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        {sent && (
          <div className="text-sm text-green-700">נשלח קישור לאיפוס אל כתובת האימייל של המשתמש.</div>
        )}
        <button type="submit" disabled={saving || !identifier.trim()} aria-busy={saving} className={`w-full px-3 py-2 rounded text-white ${saving || !identifier.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600'}`}>
          {saving ? 'שולח…' : 'שלח קישור לאימייל לאיפוס'}
        </button>
      </form>
      {sent && (
        <div className="text-sm text-gray-600 break-all">קישור (לבדיקות): <a className="text-blue-600 underline" href={sent} target="_blank" rel="noreferrer">פתיחה</a></div>
      )}
    </main>
  );
}

