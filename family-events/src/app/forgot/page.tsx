"use client";
import { useState } from 'react';

export default function ForgotPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }) });
      const j = await res.json().catch(() => ({ ok: false }));
      setSent(j.link ?? null);
      setMessage('אם החשבון קיים, שלחנו קישור לאיפוס לאימייל.');
    } catch {
      setMessage('אירעה שגיאה בשליחת הקישור. נסו שוב.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">שכחת סיסמה</h1>
      <form onSubmit={submit} className="space-y-2">
        <input autoComplete="username" className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 appearance-none" placeholder="שם משתמש / כינוי" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        <button type="submit" disabled={loading || !identifier.trim()} className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'שולח…' : 'שלח קישור לאיפוס'}</button>
      </form>
      {message && <div className="text-sm text-gray-700 dark:text-gray-300">{message}</div>}
      {sent && <div className="text-sm text-gray-600 break-all">קישור (לבדיקות): {sent}</div>}
    </main>
  );
}

