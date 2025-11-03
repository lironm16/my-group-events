# Family Events (Hebrew RTL)

- Next.js (App Router), TypeScript, Tailwind
- Prisma + Postgres (Neon for Vercel preview, Docker for local)
- Auth.js (NextAuth), Hebrew + RTL defaults

## Environment
Copy and edit env:
```bash
cp .env.example .env
# For local Docker Postgres
# DATABASE_URL=postgresql://family:family@localhost:5432/family?schema=public
```

### SMTP (Emails)
To enable email sending (password reset, activation), configure SMTP env vars:

```bash
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587 # or 465 for SSL
SMTP_USER=your_smtp_username # optional if your provider allows IP-auth
SMTP_PASS=your_smtp_password # optional if your provider allows IP-auth
SMTP_FROM="My Group Events <no-reply@yourdomain.com>"
SMTP_REPLY_TO=support@yourdomain.com # optional
NEXTAUTH_URL=https://your-app.example.com # used for links in emails
```

You can test sending as an admin via `POST /api/admin/test-email`.

## Local development
```bash
# Optional: start Postgres locally
docker compose up -d

npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

## Deploy (Vercel Preview)
- Provision Neon Postgres (or any hosted Postgres)
- Set env vars in Vercel:
  - DATABASE_URL = Postgres connection string
  - NEXTAUTH_SECRET = strong random string
  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optional)
- Build runs: `prisma migrate deploy && next build`
- Every PR will get a unique preview URL

## PWA & Web Push Notifications
- The app now exposes a manifest (`/manifest.json`) and a service worker (`/sw.js`) so it can be installed as a PWA (including on iOS ?16.4).
- Users can enable push notifications in `?????? ? ?????? ? ?????? ?????` once the app is installed on the home screen.

### Configure VAPID keys
Generate a key pair once and add the values to your environment:

```bash
npx web-push generate-vapid-keys
# copy the keys into the env
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_CONTACT_EMAIL=mailto:alerts@yourdomain.com # optional but recommended
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=$WEB_PUSH_VAPID_PUBLIC_KEY
```

### Sending push notifications from the backend
- Use `sendPushToUser(userId, payload)` from `src/lib/pushNotifications.ts` to deliver alerts to all of a user?s registered devices.
- The helper automatically removes expired subscriptions (HTTP 404/410 responses).
- Example payload: `{ title: '????? ?????', body: '?????? ???? ????? ???? ???', data: { url: '/events/123' } }`.

### Testing on iOS
1. Open the site in Safari, tap ?Share ? Add to Home Screen?.
2. Launch the app from the home screen and navigate to notification settings.
3. Tap ?????? to subscribe; you should receive the standard iOS prompt.
4. Trigger a test push by calling `sendPushToUser` from a server console / script (or add a temporary API route) using the same session user.