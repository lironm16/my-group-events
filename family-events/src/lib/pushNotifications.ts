import { prisma } from './prisma';
import { ensureWebPushConfigured, webPush } from './webPush';

const DEFAULT_TITLE = '\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9 \u05de\u05e9\u05e4\u05d7\u05ea \u05de\u05ea\u05ea\u05d9\u05d4\u05d5';
const DEFAULT_BODY = '\u05d4\u05ea\u05e8\u05d0\u05d4 \u05d7\u05d3\u05e9\u05d4';

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
    title: payload.title ?? DEFAULT_TITLE,
    body: payload.body ?? DEFAULT_BODY,
    icon: payload.icon,
    badge: payload.badge,
    data: { url: '/', ...(payload.data ?? {}) },
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
