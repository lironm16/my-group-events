'use client';

const PUBLIC_VAPID_KEY =
  process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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

export function isPushSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    const registration = existing || (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('[push] Failed to register service worker', err);
    return null;
  }
}

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if (!PUBLIC_VAPID_KEY) throw new Error('Missing NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY environment variable');

  const registration = await ensureServiceWorker();
  if (!registration) return null;

  const existing = await registration.pushManager.getSubscription();
  let subscription = existing;
  if (!subscription) {
    const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  }

  await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      userAgent: navigator.userAgent,
      platform: (navigator as any).platform,
    }),
  });

  return subscription;
}

export async function removePushSubscription(endpoint: string) {
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

