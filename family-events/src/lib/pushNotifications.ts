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

  const textTitle = payload.title ?? DEFAULT_TITLE;
  const textBody = payload.body ?? DEFAULT_BODY;
  const encodedTitle = Buffer.from(textTitle, 'utf8').toString('base64');
  const encodedBody = Buffer.from(textBody, 'utf8').toString('base64');

  const data: Record<string, unknown> = {
    url: '/',
    ...(payload.data ?? {}),
    titleB64: encodedTitle,
    bodyB64: encodedBody,
  };

  const payloadToSend = {
    title: 'Family Events',
    body: 'New notification',
    icon: payload.icon,
    badge: payload.badge,
    data,
    actions: payload.actions,
  } satisfies PushPayload;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[push] sending payload', payloadToSend);
  }

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { auth: subscription.auth, p256dh: subscription.p256dh },
          },
          JSON.stringify(payloadToSend),
          {
            headers: {
              'content-type': 'application/json; charset=utf-8',
            },
          },
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
