"use client";
import { useSession } from 'next-auth/react';

export default function AuthLoading() {
  const { status } = useSession();
  if (status !== 'loading') return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur pointer-events-none" aria-busy>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <div className="text-sm text-gray-700 dark:text-gray-200">מתחבר…</div>
      </div>
    </div>
  );
}

