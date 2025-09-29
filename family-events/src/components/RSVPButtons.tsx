"use client";

import { useCallback, useMemo, useState } from "react";

type RSVPStatus = "APPROVED" | "DECLINED" | "MAYBE";

export default function RSVPButtons({ eventId, initial, canGroup, canAll }: { eventId: string; initial?: RSVPStatus | null; canGroup?: boolean; canAll?: boolean }) {
  const [status, setStatus] = useState<RSVPStatus | null>(initial ?? null);
  const [scope, setScope] = useState<'self' | 'group' | 'all'>('self');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const post = useCallback(async (next: RSVPStatus) => {
    setSaving(true);
    try {
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, status: next, scope, note }) });
      if (res.ok) {
        setStatus(next);
      }
    } finally {
      setSaving(false);
    }
  }, [eventId, scope, note]);

  const btnCls = (active: boolean, color: string) => [
    'px-3 py-1 rounded text-sm border transition-colors',
    active ? `${color} text-white border-transparent` : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
  ].join(' ');

  const approvedActive = useMemo(() => status === 'APPROVED', [status]);
  const declinedActive = useMemo(() => status === 'DECLINED', [status]);
  const maybeActive = useMemo(() => status === 'MAYBE', [status]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button disabled={saving} onClick={() => post('APPROVED')} className={btnCls(approvedActive, 'bg-green-600')}>
          מגיע/ה
        </button>
        <button disabled={saving} onClick={() => post('DECLINED')} className={btnCls(declinedActive, 'bg-red-600')}>
          לא מגיע/ה
        </button>
        <button disabled={saving} onClick={() => post('MAYBE')} className={btnCls(maybeActive, 'bg-yellow-500')}>
          אולי
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="inline-flex items-center gap-1">
          <input type="radio" name={`scope-${eventId}`} value="self" checked={scope==='self'} onChange={()=>setScope('self')} />
          <span>עצמי</span>
        </label>
        {canGroup && (
          <label className="inline-flex items-center gap-1">
            <input type="radio" name={`scope-${eventId}`} value="group" checked={scope==='group'} onChange={()=>setScope('group')} />
            <span>הקבוצה שלי</span>
          </label>
        )}
        {canAll && (
          <label className="inline-flex items-center gap-1">
            <input type="radio" name={`scope-${eventId}`} value="all" checked={scope==='all'} onChange={()=>setScope('all')} />
            <span>כולם</span>
          </label>
        )}
      </div>
      <input
        className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
        placeholder="הערה (אופציונלי)"
        value={note}
        onChange={(e)=>setNote(e.target.value)}
      />
    </div>
  );
}

