"use client";
import { useMemo, useState } from 'react';

type Item = { id: string; status: string; note: string | null; user: { id: string; name: string | null; image?: string | null } };

type FilterKey = 'all' | 'NA' | 'APPROVED' | 'DECLINED' | 'MAYBE';

export default function RsvpInviteesList({ list }: { list: Item[] }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return list.slice();
    return list.filter((r) => r.status === filter);
  }, [list, filter]);

  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm">מוזמנים</h3>
        <div className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-1">
          <button onClick={() => setFilter('all')} className={[ 'px-2 py-1 rounded', filter==='all' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800' ].join(' ')}>הכל</button>
          <button onClick={() => setFilter('NA')} className={[ 'px-2 py-1 rounded', filter==='NA' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800' ].join(' ')}>לא השיבו</button>
          <button onClick={() => setFilter('APPROVED')} className={[ 'px-2 py-1 rounded', filter==='APPROVED' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800' ].join(' ')}>מגיעים</button>
          <button onClick={() => setFilter('DECLINED')} className={[ 'px-2 py-1 rounded', filter==='DECLINED' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800' ].join(' ')}>לא מגיעים</button>
          <button onClick={() => setFilter('MAYBE')} className={[ 'px-2 py-1 rounded', filter==='MAYBE' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800' ].join(' ')}>אולי</button>
        </div>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.map((r) => (
          <li key={r.id} className="py-2 flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.user?.image && /^https?:/i.test(r.user.image) ? r.user.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(r.user?.name || 'user')}`} alt="user" className="w-7 h-7 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{r.user?.name || '—'}</span>
                <span className="text-xs rounded px-2 py-0.5 border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  {r.status === 'APPROVED' ? 'מגיע/ה' : r.status === 'DECLINED' ? 'לא' : r.status === 'MAYBE' ? 'אולי' : '—'}
                </span>
              </div>
              {r.note && r.note.trim() && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">“{r.note}”</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
