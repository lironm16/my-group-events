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