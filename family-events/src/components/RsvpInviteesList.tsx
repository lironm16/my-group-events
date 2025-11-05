"use client";
import { useMemo, useState } from 'react';

type Item = {
  id: string;
  status: string;
  note: string | null;
  user: {
    id: string;
    name: string | null;
    image?: string | null;
    groupId?: string | null;
    groupNickname?: string | null;
  };
};

type FilterKey = 'all' | 'NA' | 'APPROVED' | 'DECLINED' | 'MAYBE';

export default function RsvpInviteesList({ list, groupNotes = {} }: { list: Item[]; groupNotes?: Record<string, string> }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return list.slice();
    return list.filter((r) => r.status === filter);
  }, [list, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; members: Item[] }>();
    filtered.forEach((item) => {
      const groupId = item.user.groupId || `__single-${item.user.id}`;
      const label = item.user.groupNickname || (item.user.groupId ? 'קבוצה ללא שם' : item.user.name || 'ללא קבוצה');
      const entry = map.get(groupId);
      if (entry) {
        entry.members.push(item);
      } else {
        map.set(groupId, { label, members: [item] });
      }
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [filtered]);

  const tabActiveCls: Record<FilterKey | 'all', string> = {
    all: 'bg-slate-600 text-white',
    NA: 'bg-gray-600 text-white',
    APPROVED: 'bg-green-600 text-white',
    DECLINED: 'bg-red-600 text-white',
    MAYBE: 'bg-yellow-500 text-white',
  } as const;
  const tabInactiveCls: Record<FilterKey | 'all', string> = {
    all: 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/30',
    NA: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    APPROVED: 'text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30',
    DECLINED: 'text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30',
    MAYBE: 'text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30',
  } as const;

  function chipCls(status: string): string {
    if (status === 'APPROVED') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
    if (status === 'DECLINED') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
    if (status === 'MAYBE') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
  }

  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm">מוזמנים</h3>
        <div className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-1">
          <button aria-pressed={filter==='all'} onClick={() => setFilter('all')} className={[ 'px-2 py-1 rounded', filter==='all' ? tabActiveCls.all : tabInactiveCls.all ].join(' ')}>הכל</button>
          <button aria-pressed={filter==='NA'} onClick={() => setFilter('NA')} className={[ 'px-2 py-1 rounded', filter==='NA' ? tabActiveCls.NA : tabInactiveCls.NA ].join(' ')}>לא השיבו</button>
          <button aria-pressed={filter==='APPROVED'} onClick={() => setFilter('APPROVED')} className={[ 'px-2 py-1 rounded', filter==='APPROVED' ? tabActiveCls.APPROVED : tabInactiveCls.APPROVED ].join(' ')}>אגיע</button>
          <button aria-pressed={filter==='DECLINED'} onClick={() => setFilter('DECLINED')} className={[ 'px-2 py-1 rounded', filter==='DECLINED' ? tabActiveCls.DECLINED : tabInactiveCls.DECLINED ].join(' ')}>לא אגיע</button>
          <button aria-pressed={filter==='MAYBE'} onClick={() => setFilter('MAYBE')} className={[ 'px-2 py-1 rounded', filter==='MAYBE' ? tabActiveCls.MAYBE : tabInactiveCls.MAYBE ].join(' ')}>אולי</button>
        </div>
      </div>
        <div className="flex flex-col">
          {grouped.map((group, index) => {
              const isSingle = group.key.startsWith('__single-');
              const notes = group.members
                .map((member) => (member.note || '').trim())
                .filter((note) => note.length > 0);
              const unifiedNote = notes.length > 0 && notes.every((note) => note === notes[0]) ? notes[0] : null;
              const groupLevelNote = !isSingle ? groupNotes[group.key] : null;
              const noteToDisplay = groupLevelNote || unifiedNote;
            return (
              <div key={group.key} className={index > 0 ? 'border-t border-gray-100 dark:border-gray-800 pt-3 mt-3' : ''}>
                {group.members.length > 1 && (
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{group.label || 'קבוצה'}</span>
                    <span>{group.members.length} משתתפים</span>
                  </div>
                )}
                  {noteToDisplay && (
                  <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 mb-2">
                      “{noteToDisplay}”
                  </div>
                )}
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.members.map((member) => (
                    <li key={member.id} className="py-2 flex items-start gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={member.user?.image && /^https?:/i.test(member.user.image) ? member.user.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(member.user?.name || 'user')}`}
                        alt="user"
                        className="w-7 h-7 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{member.user?.name || '—'}</span>
                          <span className={[ 'text-xs rounded px-2 py-0.5 border', chipCls(member.status) ].join(' ')}>
                            {member.status === 'APPROVED' ? 'אגיע' : member.status === 'DECLINED' ? 'לא אגיע' : member.status === 'MAYBE' ? 'אולי' : '—'}
                          </span>
                        </div>
                          {!noteToDisplay && member.note && member.note.trim() && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">“{member.note}”</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
    </div>
  );
}
