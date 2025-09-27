"use client";

import { useCallback, useMemo, useState } from "react";

type RSVPStatus = "APPROVED" | "DECLINED" | "MAYBE";

export default function RSVPButtons({ eventId, initial }: { eventId: string; initial?: RSVPStatus | null }) {
  const [status, setStatus] = useState<RSVPStatus | null>(initial ?? null);
  const [saving, setSaving] = useState(false);

  const post = useCallback(async (next: RSVPStatus) => {
    setSaving(true);
    try {
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, status: next }) });
      if (res.ok) {
        setStatus(next);
      }
    } finally {
      setSaving(false);
    }
  }, [eventId]);

  const btnCls = (active: boolean, color: string) => [
    'px-3 py-1 rounded text-sm border transition-colors',
    active ? `${color} text-white border-transparent` : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
  ].join(' ');

  const approvedActive = useMemo(() => status === 'APPROVED', [status]);
  const declinedActive = useMemo(() => status === 'DECLINED', [status]);
  const maybeActive = useMemo(() => status === 'MAYBE', [status]);

  return (
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
  );
}

