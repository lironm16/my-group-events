"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RSVPStatus = "APPROVED" | "DECLINED" | "MAYBE" | "NA";

export default function RSVPButtons({ eventId, initial, initialNote, initialGroupNote, canGroup, canAll, onSaved }: { eventId: string; initial?: RSVPStatus | null; initialNote?: string | null; initialGroupNote?: string | null; canGroup?: boolean; canAll?: boolean; onSaved?: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<RSVPStatus | null>(initial ?? 'NA');
  const [scope, setScope] = useState<'self' | 'group' | 'all'>('self');
  const normalizedInitialNote = (initialNote ?? '').trim();
  const normalizedInitialGroupNote = (initialGroupNote ?? '').trim();
  const [groupNote, setGroupNote] = useState<string>(normalizedInitialGroupNote);
  const [saving, setSaving] = useState(false);
  const initialStatusRef = useRef<RSVPStatus | null>(initial ?? 'NA');
  const initialGroupNoteRef = useRef<string>(normalizedInitialGroupNote);

  const save = useCallback(async () => {
    const noteTrimmed = scope === 'group' ? groupNote.trim() : '';
    const statusChanged = status !== initialStatusRef.current;
    const noteChanged = scope === 'group' ? noteTrimmed !== initialGroupNoteRef.current : false;
    if (!statusChanged && !noteChanged) return;
    setSaving(true);
    try {
      const payload: any = { eventId, scope };
      if (!statusChanged && noteChanged) {
        payload.status = null;
      } else {
        payload.status = status;
      }
      payload.note = scope === 'group' ? (noteTrimmed || null) : null;
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) return;
      try {
        router.refresh();
      } catch {}
      try {
        if (onSaved) onSaved();
      } catch {}
      initialStatusRef.current = status;
      if (scope === 'group') {
        initialGroupNoteRef.current = noteTrimmed;
        setGroupNote(noteTrimmed);
      }
    } finally {
      setSaving(false);
    }
  }, [eventId, scope, groupNote, status, router, onSaved]);

  const btnCls = (active: boolean, color: string) => [
    'px-3 py-1 rounded text-sm border transition-colors',
    active ? `${color} text-white border-transparent` : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
  ].join(' ');

  const approvedActive = useMemo(() => status === 'APPROVED', [status]);
  const declinedActive = useMemo(() => status === 'DECLINED', [status]);
  const maybeActive = useMemo(() => status === 'MAYBE', [status]);
  const naActive = useMemo(() => status === 'NA' || status == null, [status]);
  const statusDirty = status !== initialStatusRef.current;
    const currentNote = scope === 'group' ? groupNote : '';
    const noteDirty = scope === 'group' ? currentNote.trim() !== initialGroupNoteRef.current : false;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button disabled={saving} onClick={() => setStatus('APPROVED')} className={btnCls(approvedActive, 'bg-green-600')}>
          אגיע
        </button>
        <button disabled={saving} onClick={() => setStatus('DECLINED')} className={btnCls(declinedActive, 'bg-red-600')}>
          לא אגיע
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
        <div className="flex flex-col gap-2">
          {scope === 'group' && canGroup && (
            <div className="relative">
              <input
                className="w-full border pr-10 pl-3 p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
                placeholder="הערה לקבוצה (אופציונלי)"
                value={groupNote}
                onChange={(e)=>setGroupNote(e.target.value)}
              />
              {groupNote && (
                <button
                  type="button"
                  onClick={() => setGroupNote('')}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  aria-label="ניקוי ההערה"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        <button
          disabled={saving || (!statusDirty && !noteDirty)}
          onClick={save}
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
        >שמירה</button>
      </div>
    </div>
  );
}


