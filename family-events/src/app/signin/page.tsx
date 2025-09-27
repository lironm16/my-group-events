"use client";
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);

  async function signInGoogle() {
    try {
      setLoading('google');
      await signIn('google', { callbackUrl: '/events' });
    } catch (e) {
      setLoading(null);
      alert('שגיאה בהתחברות עם Google');
    }
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading('email');
      await signIn('credentials', { email, callbackUrl: '/events' });
    } catch (e) {
      alert('אירעה שגיאה בתהליך הכניסה');
      setLoading(null);
    }
  }

  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">התחברות</h1>
      <button onClick={signInGoogle} disabled={loading === 'google'} className="w-full px-3 py-2 bg-blue-600 text-white rounded">
        {loading === 'google' ? 'מתחבר…' : 'התחברות עם Google'}
      </button>
      <div className="text-center text-sm text-gray-500">או</div>
      <form onSubmit={signInEmail} className="space-y-2">
        <input className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" type="email" placeholder="האימייל שלכם" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <button disabled={!email || loading === 'email'} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">
          {loading === 'email' ? 'שולח…' : 'כניסה באימייל'}
        </button>
      </form>
    </main>
  );
}

