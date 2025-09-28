"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError('קישור לא תקין או חסר'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      if (res.ok) {
        router.push('/signin');
      } else {
        const j = await res.json().catch(()=>({ error: 'שגיאה באיפוס הסיסמה' }));
        setError(j.error || 'שגיאה באיפוס הסיסמה');
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">איפוס סיסמה</h1>
      {!token && <div className="text-sm text-red-600">קישור לא תקין או חסר</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="סיסמה חדשה" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={saving || !token} className="w-full px-3 py-2 bg-blue-600 text-white rounded">{saving?'שומר…':'איפוס'}</button>
      </form>
    </main>
  );
}

