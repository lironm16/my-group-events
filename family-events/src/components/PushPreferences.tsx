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

export default function PushPreferences() {
  const [supported, setSupported] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<StatusState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

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
    try {
      const response = await fetch('/api/push/subscriptions', { method: 'GET' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '????? ???');
      }
      const data = await response.json();
      setEnabled(Boolean(data.hasSubscription));
      setVapidKey(data.vapidPublicKey ?? null);
      setMessage(null);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [supported]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const canToggle = useMemo(() => supported && vapidKey, [supported, vapidKey]);

  const handleSubscribe = useCallback(async () => {
    if (!canToggle || !vapidKey) return;
    setStatus('loading');
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('?? ???? ????? ?????? ??? ?????? ?? ???????.');
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
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
        throw new Error(data.error || '????? ?????');
      }

      setEnabled(true);
      setStatus('success');
      setMessage('?????? ?????? ??????.');
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
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch('/api/push/subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      setEnabled(false);
      setStatus('success');
      setMessage('?????? ?????.');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage((error as Error).message);
    }
  }, []);

  if (!supported) {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-right" dir="rtl">
        <p className="font-medium text-yellow-800">?????? ?????? ?? ???? ??????? ?????.</p>
        <p className="text-sm text-yellow-700">?-iOS ?? ?????? ?? ????????? ???? ???? (PWA) ??????? ?-iOS 16.4 ?????.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3" dir="rtl">
      {!standalone && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <p className="font-medium">?????? ?????? ?-iOS:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>???? ?? ?????? <span aria-hidden>Share</span>.</li>
            <li>???? ????? &quot;???? ???? ????&quot;.</li>
            <li>???? ?? ????????? ????? ???? ??????? ??? ?? ???????.</li>
          </ol>
        </div>
      )}
      <div className="flex items-center justify-between rounded border p-3">
        <div>
          <p className="font-semibold">?????? ?????</p>
          <p className="text-sm text-gray-600">???? ????? ?? ??????? ???????? ?????? ????.</p>
        </div>
        <button
          type="button"
          onClick={enabled ? handleUnsubscribe : handleSubscribe}
          disabled={status === 'loading' || !canToggle}
          className={`rounded px-4 py-2 text-sm font-semibold shadow-sm transition ${
            enabled ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300' : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300'
          }`}
        >
          {enabled ? '???' : '????'}
        </button>
      </div>
      {message && (
        <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{message}</p>
      )}
      {!vapidKey && (
        <p className="text-sm text-red-600">?? ?????? ?????? VAPID ??? ???? ??? ????? ?? ???????.</p>
      )}
    </section>
  );
}
