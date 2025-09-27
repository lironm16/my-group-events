"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    setSaving(false);
    if (res.ok) router.push('/signin');
  }
  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">איפוס סיסמה</h1>
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full border p-2 rounded" placeholder="סיסמה חדשה" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={saving} className="w-full px-3 py-2 bg-blue-600 text-white rounded">{saving?'שומר…':'איפוס'}</button>
      </form>
    </main>
  );
}

