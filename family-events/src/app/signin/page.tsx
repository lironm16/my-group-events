"use client";
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const { status } = useSession();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<'login' | null>(null);

  // Google removed per request

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading('login');
      const pwd = (e.target as HTMLFormElement).password.value as string;
      const res = await signIn('credentials', { username, password: pwd, redirect: false });
      if (res?.ok) {
        router.replace('/events');
        return;
      }
      setError('שם משתמש/כינוי או סיסמה שגויים');
    } catch (e) {
      alert('אירעה שגיאה בתהליך הכניסה');
      setLoading(null);
    }
  }

  useEffect(() => {
    if (status === 'authenticated') router.replace('/events');
  }, [status, router]);

  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">התחברות</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex items-center justify-between text-sm">
        <a href="/signup" className="text-blue-600">אין לכם משתמש? הרשמה</a>
        <a href="/forgot" className="text-blue-600">שכחת סיסמה?</a>
      </div>
      <form onSubmit={signInEmail} className="space-y-2">
        <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" name="username" placeholder="שם משתמש / כינוי" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" name="password" type="password" placeholder="סיסמה" />
        <button disabled={!username || loading === 'login'} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">
          {loading === 'login' ? 'שולח…' : 'כניסה'}
        </button>
      </form>
    </main>
  );
}

