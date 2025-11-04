import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

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
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('[push] Missing VAPID keys; push delivery disabled');
    return false;
  }
  const contact = process.env.VAPID_CONTACT_EMAIL || `mailto:${process.env.SMTP_FROM || 'noreply@example.com'}`;
  try {
    webpush.setVapidDetails(contact, publicKey, privateKey);
    configured = true;
    return true;
  } catch (err) {
    console.error('[push] Failed to configure VAPID', err);
    return false;
  }
}

export async function sendPushToUsers(userIds: string[] | readonly string[], payload: PushPayload) {
  if (!userIds || !userIds.length) return;
  if (!ensureConfigured()) return;
  const distinctIds = Array.from(new Set(userIds));
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: distinctIds as string[] } } });
  if (!subscriptions.length) return;

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
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.code;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error('[push] Failed to deliver notification', statusCode, err);
        }
      }
    }),
  );

  if (staleIds.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

export async function sendPushToUsersExcept(
  userIds: string[] | readonly string[],
  excludedUserIds: string[] | readonly string[] | undefined,
  payload: PushPayload,
) {
  if (!userIds?.length) return;
  const excludedSet = new Set(excludedUserIds || []);
  const filtered = userIds.filter((id) => !excludedSet.has(id));
  if (!filtered.length) return;
  await sendPushToUsers(filtered, payload);
}

