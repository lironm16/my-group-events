import webPush from 'web-push';

const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL ?? 'mailto:no-reply@family-events.local';

if (publicKey && privateKey) {
  webPush.setVapidDetails(contactEmail, publicKey, privateKey);
}

export function ensureWebPushConfigured() {
  if (!publicKey || !privateKey) {
    throw new Error('Web Push VAPID keys are not configured.');
  }
}

export function getVapidPublicKey() {
  if (!publicKey) {
    throw new Error('Web Push VAPID public key is not configured.');
  }
  return publicKey;
}

export { webPush };
