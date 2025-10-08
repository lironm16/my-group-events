"use client";
export const dynamic = 'force-dynamic';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<'login' | null>(null);

  // Google removed per request

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading('login');
      const pwd = (e.target as HTMLFormElement).password.value as string;
      const res = await signIn('credentials', { email, password: pwd, redirect: false });
      if (res?.ok) {
        router.replace('/events');
        return;
      }
      setError('אימייל או סיסמה שגויים');
    } catch (e) {
      alert('אירעה שגיאה בתהליך הכניסה');
      setLoading(null);
    } finally {
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
        <input autoComplete="email" className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 appearance-none dark:[-webkit-text-fill-color:#e5e7eb]" name="email" placeholder="אימייל" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input autoComplete="current-password" className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 appearance-none dark:[-webkit-text-fill-color:#e5e7eb]" name="password" type="password" placeholder="סיסמה" />
        <button disabled={!email || loading === 'login'} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">
          {loading === 'login' ? 'שולח…' : 'כניסה'}
        </button>
      </form>
    </main>
  );
}

