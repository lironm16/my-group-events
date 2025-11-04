'use client';

import { useEffect } from 'react';

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function removeSubscription(endpoint: string) {
  try {
    await fetch('/api/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  } catch (err) {
    console.warn('[push] Failed to unregister subscription', err);
  }
}

export default function PushNotificationsInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[push] Browser does not support web push');
      return;
    }

    let cancelled = false;

    async function register() {
      if (!PUBLIC_VAPID_KEY) {
        console.warn('[push] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY');
        return;
      }
      try {
        const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
        const registration = existingRegistration || (await navigator.serviceWorker.register('/sw.js'));
        await navigator.serviceWorker.ready;

        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        const subscription = await registration.pushManager.getSubscription();
        if (permission !== 'granted') {
          if (subscription) {
            await removeSubscription(subscription.endpoint);
            await subscription.unsubscribe();
          }
          return;
        }

        const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
        const activeSubscription =
          subscription || (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));

        if (cancelled) return;

        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: activeSubscription,
            userAgent: navigator.userAgent,
            platform: (navigator as any).platform,
          }),
        });
      } catch (err) {
        console.error('[push] Failed to initialise web push', err);
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

