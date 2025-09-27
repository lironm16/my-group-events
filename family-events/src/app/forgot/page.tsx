"use client";
import { useState } from 'react';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const j = await res.json();
    setSent(j.link ?? '');
  }
  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">שכחת סיסמה</h1>
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full border p-2 rounded" placeholder="האימייל שלכם" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="w-full px-3 py-2 bg-blue-600 text-white rounded">שלח קישור איפוס</button>
      </form>
      {sent && (
        <div className="text-sm text-gray-600 break-all">קישור (לבדיקות): {sent}</div>
      )}
    </main>
  );
}

