'use client';

import { useEffect } from 'react';
import { ensurePushSubscription, ensureServiceWorker, isPushSupported } from '@/lib/clientPush';

export default function PushNotificationsInitializer() {
  useEffect(() => {
    if (!isPushSupported()) return;
    let cancelled = false;

    async function hydrate() {
      try {
        await ensureServiceWorker();
        if (Notification.permission === 'granted' && !cancelled) {
          await ensurePushSubscription();
        }
      } catch (err) {
        console.error('[push] Failed to hydrate existing push subscription', err);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

