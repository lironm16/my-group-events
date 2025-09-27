"use client";
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState<'email' | null>(null);

  // Google removed per request

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading('email');
      const pwd = (e.target as HTMLFormElement).password.value as string;
      await signIn('credentials', { username, password: pwd, callbackUrl: '/events' });
    } catch (e) {
      alert('אירעה שגיאה בתהליך הכניסה');
      setLoading(null);
    }
  }

  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">התחברות</h1>
      <div className="flex items-center justify-between text-sm">
        <a href="/signup" className="text-blue-600">אין לכם משתמש? הרשמה</a>
        <a href="/forgot" className="text-blue-600">שכחת סיסמה?</a>
      </div>
      <form onSubmit={signInEmail} className="space-y-2">
        <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" name="username" placeholder="כינוי / אימייל" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" name="password" type="password" placeholder="סיסמה" />
        <button disabled={!username || loading === 'email'} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">
          {loading === 'email' ? 'שולח…' : 'כניסה באימייל'}
        </button>
      </form>
    </main>
  );
}

