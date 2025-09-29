import { authOptions } from '@/auth';

export const dynamic = 'force-dynamic';

export default function DebugAuthPage() {
  const data = {
    sessionStrategy: (authOptions as any)?.session?.strategy || 'unknown',
    providers: ((authOptions as any)?.providers || []).map((p: any) => p.id),
    hasAdapter: !!(authOptions as any)?.adapter,
  };
  return (
    <main className="container-page max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Auth Debug</h1>
      <pre className="p-3 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}

