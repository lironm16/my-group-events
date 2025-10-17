"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RSVPStatus = "APPROVED" | "DECLINED" | "MAYBE" | "NA";

export default function RSVPButtons({ eventId, initial, canGroup, canAll }: { eventId: string; initial?: RSVPStatus | null; canGroup?: boolean; canAll?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<RSVPStatus | null>(initial ?? 'NA');
  const [scope, setScope] = useState<'self' | 'group' | 'all'>('self');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const initialStatusRef = useRef<RSVPStatus | null>(initial ?? 'NA');

  const save = useCallback(async () => {
    const noteTrimmed = note.trim();
    const statusChanged = status !== initialStatusRef.current;
    const onlyCommentChange = !statusChanged && noteTrimmed.length > 0;
    if (!status && noteTrimmed.length === 0) return;
    setSaving(true);
    try {
      const payload: any = { eventId, scope };
      if (onlyCommentChange) {
        // Let server update note only without touching status
        payload.status = null;
        payload.note = noteTrimmed;
      } else {
        payload.status = status;
        payload.note = noteTrimmed;
      }
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) return;
      try { router.refresh(); } catch {}
    } finally {
      setSaving(false);
    }
  }, [eventId, scope, note, status, router]);

  const btnCls = (active: boolean, color: string) => [
    'px-3 py-1 rounded text-sm border transition-colors',
    active ? `${color} text-white border-transparent` : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
  ].join(' ');

  const approvedActive = useMemo(() => status === 'APPROVED', [status]);
  const declinedActive = useMemo(() => status === 'DECLINED', [status]);
  const maybeActive = useMemo(() => status === 'MAYBE', [status]);
  const naActive = useMemo(() => status === 'NA' || status == null, [status]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button disabled={saving} onClick={() => setStatus('APPROVED')} className={btnCls(approvedActive, 'bg-green-600')}>
          מגיע/ה
        </button>
        <button disabled={saving} onClick={() => setStatus('DECLINED')} className={btnCls(declinedActive, 'bg-red-600')}>
          לא מגיע/ה
        </button>
        <button disabled={saving} onClick={() => setStatus('MAYBE')} className={btnCls(maybeActive, 'bg-yellow-500')}>
          אולי
        </button>
        <button disabled={saving} onClick={() => setStatus('NA')} className={btnCls(naActive, 'bg-gray-500')}>
          —
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
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          className="flex-1 border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
          placeholder="הערה (אופציונלי)"
          value={note}
          onChange={(e)=>setNote(e.target.value)}
        />
        <button disabled={saving || (!status && !note.trim())} onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">שמירה</button>
      </div>
    </div>
  );
}

