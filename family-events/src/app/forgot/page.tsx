"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ForgotPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const id = identifier.trim();
      if (!id) return;
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id }),
      });
      if (res.ok) {
        // Navigate away so we don't remain on the reset request screen
        router.replace('/signin');
        return;
      }
      if (res.status === 404) {
        setError(`לא נמצא משתמש עבור: ${id}`);
        return;
      }
      setError('אירעה שגיאה בשליחת הקישור. נסו שוב.');
    } catch {
      setError('אירעה שגיאה בשליחת הקישור. נסו שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">שכחת סיסמה</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <form onSubmit={submit} className="space-y-2">
        <input
          autoComplete="email"
          className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 appearance-none"
          placeholder="שם משתמש או אימייל"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !identifier.trim()}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'שולח…' : 'שלח קישור לאיפוס'}
        </button>
      </form>
    </main>
  );
}

