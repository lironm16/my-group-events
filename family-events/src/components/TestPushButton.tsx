'use client';

import { useState, useTransition } from 'react';

type Status = 'idle' | 'success' | 'error';

export default function TestPushButton() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setStatus('idle');
    setMessage('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/push/test', { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.ok) {
          setStatus('success');
          setMessage('התראת בדיקה נשלחה. אם לא התקבלה, ודאו שהדפדפן מאפשר התראות.');
        } else {
          setStatus('error');
          setMessage(json?.error || 'שליחת ההתראה נכשלה.');
        }
      } catch (err) {
        console.error('[push] Failed to send test push', err);
        setStatus('error');
        setMessage('שליחת ההתראה נכשלה.');
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? 'שולח...' : 'שלחו בדיקת Push למכשיר זה'}
      </button>
      {message && (
        <p className={status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{message}</p>
      )}
    </div>
  );
}

