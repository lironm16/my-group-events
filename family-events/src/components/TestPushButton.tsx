'use client';

import { useState, useTransition } from 'react';
import { ensurePushSubscription, ensureServiceWorker, isPushSupported } from '@/lib/clientPush';

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
        if (!isPushSupported()) {
          setStatus('error');
          setMessage('הדפדפן לא תומך בהתראות Push.');
          return;
        }

        await ensureServiceWorker();

        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          setStatus('error');
          setMessage('יש לאשר קבלת התראות במכשיר כדי לשלוח בדיקה.');
          return;
        }

        await ensurePushSubscription();

        const res = await fetch('/api/push/test', { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.ok) {
          const delivered: number = json?.result?.delivered ?? 0;
          const attempted: number = json?.result?.attempted ?? 0;
          const stale: number = json?.result?.staleSubscriptionIds?.length ?? 0;
          const failures: number = json?.result?.failures?.length ?? 0;
          if (delivered > 0) {
            setStatus('success');
            setMessage(`התראת בדיקה נשלחה למכשיר (${delivered}/${attempted}). אם לא התקבלה, בדקו את הגדרות ההתראות במכשיר.`);
          } else {
            setStatus('error');
            const reason = failures
              ? 'השרת דיווח על שגיאה בשליחה (ראו לוגים ב-Vercel).'
              : stale
                ? 'הרשמה ישנה נמחקה. נסו ללחוץ שוב כדי להירשם מחדש.'
                : 'לא נמצאו מכשירים פעילים. ודאו שאישרתם התראות במכשיר זה.';
            setMessage(reason);
          }
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

