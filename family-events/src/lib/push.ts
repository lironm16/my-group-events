import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

export type PushDispatchResult = {
  attempted: number;
  delivered: number;
  staleSubscriptionIds: string[];
  failures: { subscriptionId: string; statusCode?: number; message?: string }[];
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

let configured = false;
let configurationAttempted = false;

function ensureConfigured() {
  if (configured) return true;
  if (configurationAttempted) return false;
  configurationAttempted = true;
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('[push] Missing VAPID keys; push delivery disabled');
    return false;
  }
  const rawContact = process.env.VAPID_CONTACT_EMAIL || process.env.SMTP_FROM || 'support@example.com';
  const normalizedContact = (() => {
    const trimmed = rawContact.trim();
    if (!trimmed) return 'mailto:support@example.com';
    if (/^https?:/i.test(trimmed) || /^mailto:/i.test(trimmed)) {
      return trimmed;
    }
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      return `mailto:${trimmed}`;
    }
    // Fall back to default if value is not a bare email/URL/mailto
    return 'mailto:support@example.com';
  })();
  try {
    webpush.setVapidDetails(normalizedContact, publicKey, privateKey);
    configured = true;
    return true;
  } catch (err) {
    console.error('[push] Failed to configure VAPID', err);
    return false;
  }
}

export async function sendPushToUsers(userIds: string[] | readonly string[], payload: PushPayload): Promise<PushDispatchResult> {
  const empty: PushDispatchResult = { attempted: 0, delivered: 0, staleSubscriptionIds: [], failures: [] };
  if (!userIds || !userIds.length) return empty;
  if (!ensureConfigured()) return empty;
  const distinctIds = Array.from(new Set(userIds));
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: distinctIds as string[] } } });
  if (!subscriptions.length) return empty;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/templates/party.jpg',
    badge: payload.badge,
    tag: payload.tag,
    url: payload.url,
    data: {
      url: payload.url,
      ...payload.data,
    },
  });

  const staleIds: string[] = [];
  const failures: { subscriptionId: string; statusCode?: number; message?: string }[] = [];
  let delivered = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message,
        );
        delivered += 1;
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.code;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error('[push] Failed to deliver notification', statusCode, err);
          failures.push({ subscriptionId: sub.id, statusCode, message: err?.message });
        }
      }
    }),
  );

  if (staleIds.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }

  return { attempted: subscriptions.length, delivered, staleSubscriptionIds: staleIds, failures };
}

export async function sendPushToUsersExcept(
  userIds: string[] | readonly string[],
  excludedUserIds: string[] | readonly string[] | undefined,
  payload: PushPayload,
) {
  if (!userIds?.length) return { attempted: 0, delivered: 0, staleSubscriptionIds: [], failures: [] };
  const excludedSet = new Set(excludedUserIds || []);
  const filtered = userIds.filter((id) => !excludedSet.has(id));
  if (!filtered.length) return { attempted: 0, delivered: 0, staleSubscriptionIds: [], failures: [] };
  return sendPushToUsers(filtered, payload);
}

