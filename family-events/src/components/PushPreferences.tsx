'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type StatusState = 'idle' | 'loading' | 'success' | 'error';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const TEXT = {
  serverError: 'שגיאת שרת',
  permissionRequired: 'יש לאשר שליחת התראות כדי להפעיל את ההתראות.',
  activationFailed: 'הפעלה נכשלה',
  activated: 'התראות הופעלו בהצלחה.',
  deactivated: 'התראות בוטלו.',
  unsupportedTitle: 'הדפדפן הנוכחי לא תומך בהתראות דפדפן.',
  unsupportedBody: 'ב-iOS יש להתקין את האפליקציה למסך הבית (PWA) ולהשתמש ב-iOS 16.4 ומעלה.',
  iosHeading: 'הפעלת התראות ב-iOS:',
  iosStep1: 'פתחו את תפריט השיתוף (Share).',
  iosStep2: 'גללו ובחרו "הוסף למסך הבית".',
  iosStep3: 'פתחו את האפליקציה מהמסך הבית והפעילו כאן את ההתראות.',
  pushHeading: 'התראות דחיפה',
  pushDescription: 'קבלו התראה על אירועים ועדכונים ישירות למסך.',
  toggleOff: 'כבה',
  toggleOn: 'הפעל',
  vapidMissing: 'יש להגדיר מפתחות VAPID בצד השרת כדי לאפשר את ההתראות.',
  testButton: 'שלח התראת בדיקה',
  testSuccess: 'התראת בדיקה נשלחה.',
  testFailed: 'שליחת ההתראה נכשלה.',
  noSubscription: 'אין הרשמה פעילה להתראות במכשיר זה.',
} as const;

export default function PushPreferences() {
  const [supported, setSupported] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<StatusState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<StatusState>('idle');

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(isSupported);
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setStandalone(mediaQuery.matches);
    const listener = (event: MediaQueryListEvent) => setStandalone(event.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener?.('change', listener);
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener?.(listener);
    }

    return undefined;
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!supported) return;
    setMessage(null);
    try {
      const response = await fetch('/api/push/subscriptions', { method: 'GET' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || TEXT.serverError);
      }
      const data = await response.json();
      setVapidKey(data.vapidPublicKey ?? null);
    } catch (error) {
      setMessage((error as Error).message);
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(subscription));
      } catch (error) {
        console.error('Failed to inspect push subscription', error);
      }
    }
  }, [supported]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const canToggle = useMemo(() => supported && vapidKey && status !== 'loading', [supported, vapidKey, status]);

  const handleSubscribe = useCallback(async () => {
    if (!canToggle || !vapidKey) return;
    setStatus('loading');
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(TEXT.permissionRequired);
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe().catch((error) => console.warn('Unsubscribe failed', error));
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const response = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || TEXT.activationFailed);
      }

      const refreshed = await registration.pushManager.getSubscription();
      setEnabled(Boolean(refreshed));
      setStatus('success');
      setMessage(TEXT.activated);
      setTestStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage((error as Error).message);
      setEnabled(false);
    }
  }, [canToggle, vapidKey]);

  const handleUnsubscribe = useCallback(async () => {
    setStatus('loading');
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      let endpoint: string | undefined;
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe();
      }
      if (endpoint) {
        await fetch('/api/push/subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      const refreshed = await registration.pushManager.getSubscription();
      setEnabled(Boolean(refreshed));
      setStatus('success');
      setMessage(TEXT.deactivated);
      setTestStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage((error as Error).message);
    }
  }, []);

  const handleSendTest = useCallback(async () => {
    setTestStatus('loading');
    setMessage(null);
    setStatus('idle');
    try {
      const response = await fetch('/api/push/test', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || TEXT.testFailed);
      }
      setTestStatus('success');
      setMessage(TEXT.testSuccess);
    } catch (error) {
      console.error(error);
      setTestStatus('error');
      setMessage((error as Error).message || TEXT.testFailed);
    }
  }, []);

  const messageIsError = status === 'error' || testStatus === 'error';

  if (!supported) {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-right" dir="rtl">
        <p className="font-medium text-yellow-800">{TEXT.unsupportedTitle}</p>
        <p className="text-sm text-yellow-700">{TEXT.unsupportedBody}</p>
      </div>
    );
  }

  return (
    <section className="space-y-3" dir="rtl">
      {!standalone && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <p className="font-medium">{TEXT.iosHeading}</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>{TEXT.iosStep1}</li>
            <li>{TEXT.iosStep2}</li>
            <li>{TEXT.iosStep3}</li>
          </ol>
        </div>
      )}
      <div className="flex items-center justify-between rounded border p-3">
        <div>
          <p className="font-semibold">{TEXT.pushHeading}</p>
          <p className="text-sm text-gray-600">{TEXT.pushDescription}</p>
        </div>
        <button
          type="button"
          onClick={enabled ? handleUnsubscribe : handleSubscribe}
          disabled={status === 'loading' || !canToggle}
          className={`rounded px-4 py-2 text-sm font-semibold shadow-sm transition ${
            enabled ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300' : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300'
          }`}
        >
          {enabled ? TEXT.toggleOff : TEXT.toggleOn}
        </button>
      </div>
      {enabled && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testStatus === 'loading'}
            className="rounded px-4 py-2 text-sm font-semibold border border-emerald-500 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
          >
            {testStatus === 'loading' ? 'שולח...' : TEXT.testButton}
          </button>
        </div>
      )}
      {message && (
        <p className={`text-sm ${messageIsError ? 'text-red-600' : 'text-emerald-600'}`}>{message}</p>
      )}
      {!vapidKey && (
        <p className="text-sm text-red-600">{TEXT.vapidMissing}</p>
      )}
    </section>
  );
}
