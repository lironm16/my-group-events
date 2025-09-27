import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function FamilyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="container-page space-y-4">
        <h1 className="text-2xl font-bold">משפחה</h1>
        <p className="text-gray-600 dark:text-gray-300">התחברו כדי לנהל משפחה.</p>
      </main>
    );
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { family: true } });
  let family = user?.family ?? null;

  if (!family) {
    // Offer join by code
    return (
      <main className="container-page space-y-4 max-w-xl">
        <h1 className="text-2xl font-bold">משפחה</h1>
        <JoinForm />
      </main>
    );
  }

  const base = process.env.NEXTAUTH_URL ?? '';
  const inviteUrl = `${base}/family?code=${encodeURIComponent(family.inviteCode)}`;

  return (
    <main className="container-page space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{family.name}</h1>
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">קוד הזמנה</div>
            <div className="font-mono text-lg">{family.inviteCode}</div>
          </div>
          <CopyButton value={inviteUrl} />
        </div>
      </div>
    </main>
  );
}

function CopyButton({ value }: { value: string }) {
  return (
    <button
      className="px-3 py-2 bg-blue-600 text-white rounded"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          alert('הקישור הועתק');
        } catch {}
      }}
    >
      העתק קישור הזמנה
    </button>
  );
}

function JoinForm() {
  return (
    <form
      className="space-y-3"
      action={async (formData: FormData) => {
        'use server';
        const code = String(formData.get('code') ?? '');
        await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/family/join`, { method: 'POST', body: JSON.stringify({ code }) });
      }}
    >
      <p className="text-gray-600 dark:text-gray-300">אין לכם משפחה עדיין? הצטרפו עם קוד הזמנה:</p>
      <input name="code" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="קוד הזמנה" />
      <button className="px-3 py-2 bg-blue-600 text-white rounded">הצטרפות</button>
    </form>
  );
}

