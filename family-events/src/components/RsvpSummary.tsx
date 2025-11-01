"use client";

import { useState } from 'react';

export default function RsvpSummary({ approved, maybe, declined, waiting, total }: { approved: number; maybe: number; declined: number; waiting: number; total: number }) {
  const [mode, setMode] = useState<'count'|'percent'>('count');
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
  const label = (name: string, n: number) => mode === 'count' ? `${n} ${name}` : `${pct(n)}% ${name}`;
  const responded = approved + maybe + declined;
  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-200">
        <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          {approved > 0 && (
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{label('אגיע', approved)}</span>
          )}
          {maybe > 0 && (
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />{label('אולי', maybe)}</span>
          )}
          {declined > 0 && (
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{label('לא אגיע', declined)}</span>
          )}
          {waiting > 0 && (
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 inline-block" />{label('לא השיבו', waiting)}</span>
          )}
        </div>
        <button type="button" onClick={() => setMode(m => m==='count'?'percent':'count')} className="px-2 py-1 text-xs rounded border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">{mode==='count'?'אחוזים':'כמות'}</button>
      </div>
      <div className="mt-3">
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="flex h-full w-full">
            {approved > 0 && <div className="h-full bg-green-500" style={{ width: `${(approved/total)*100}%` }} />}
            {maybe > 0 && <div className="h-full bg-yellow-400" style={{ width: `${(maybe/total)*100}%` }} />}
            {declined > 0 && <div className="h-full bg-red-500" style={{ width: `${(declined/total)*100}%` }} />}
            {waiting > 0 && <div className="h-full bg-gray-300 dark:bg-gray-700" style={{ width: `${(waiting/total)*100}%` }} />}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {mode === 'count' ? (
            <>{responded}/{total} השיבו</>
          ) : (
            <>{total ? Math.round((responded / total) * 100) : 0}% השיבו</>
          )}
        </div>
      </div>
    </div>
  );
}
