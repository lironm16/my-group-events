import { prisma } from './prisma';
import { ensureWebPushConfigured, webPush } from './webPush';

type PushPayload = {
  title?: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
};

export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureWebPushConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subscriptions.length) return;

  const safePayload = {
    title: payload.title || undefined,
    body: payload.body || undefined,
    icon: payload.icon,
    badge: payload.badge,
    data: payload.data ?? { url: '/' },
    actions: payload.actions,
  } satisfies PushPayload;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { auth: subscription.auth, p256dh: subscription.p256dh },
          },
          JSON.stringify(safePayload),
        );
      } catch (error: any) {
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: subscription.endpoint } }).catch(() => undefined);
        } else {
          throw error;
        }
      }
    }),
  );
}
