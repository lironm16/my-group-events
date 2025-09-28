"use client";
import { useState } from 'react';

export default function ForgotPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }) });
    const j = await res.json();
    setSent(j.link ?? '');
  }
  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">שכחת סיסמה</h1>
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="שם משתמש / כינוי" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        <button className="w-full px-3 py-2 bg-blue-600 text-white rounded">שלח קישור לאימייל לאיפוס</button>
      </form>
      {sent && (
        <div className="text-sm text-gray-600 break-all">קישור (לבדיקות): {sent}</div>
      )}
    </main>
  );
}

