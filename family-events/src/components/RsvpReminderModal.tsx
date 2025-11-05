'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';

type TargetOption = 'waiting' | 'maybe' | 'group';

interface GroupOption {
  id: string;
  name: string;
  waiting: number;
  total: number;
}

interface ReminderModalProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
  waitingCount: number;
  maybeCount: number;
  groups: GroupOption[];
}

const MAX_MESSAGE_LEN = 180;

export default function RsvpReminderModal({ eventId, eventTitle, open, onClose, waitingCount, maybeCount, groups }: ReminderModalProps) {
  const [target, setTarget] = useState<TargetOption>('waiting');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [isPending, startTransition] = useTransition();
  const [resultSummary, setResultSummary] = useState<string | null>(null);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupId) || groups[0], [groups, groupId]);

  const placeholder = useMemo(() => {
    if (target === 'group' && selectedGroup) {
      if (selectedGroup.waiting > 0) {
        return `היי ${selectedGroup.name}, המארחים מחכים לתשובה מכם לגבי האירוע.`;
      }
      return `היי ${selectedGroup.name}, נשמח לדעת אם אתם מצטרפים אלינו באירוע הקרוב.`;
    }
    if (target === 'maybe') {
      return 'האירוע מתקרב ונשמח לדעת אם אתם מצטרפים כדי שניערך בהתאם.';
    }
    return 'אנחנו בונים עליכם באירוע – אנא עדכנו סטטוס בקרוב.';
  }, [target, selectedGroup]);

  const disabledReason = useMemo(() => {
    if (isPending) return 'שולח תזכורת…';
    if (target === 'waiting' && waitingCount === 0) return 'אין מוזמנים שממתינים לאישור.';
    if (target === 'maybe' && maybeCount === 0) return 'אין מוזמנים שמסומנים כ״אולי״.';
    if (target === 'group' && !selectedGroup) return 'בחרו קבוצה לשליחת התזכורת.';
    return null;
  }, [isPending, target, waitingCount, maybeCount, selectedGroup]);

  const resetState = useCallback(() => {
    setStatus('idle');
    setFeedback('');
    setResultSummary(null);
  }, []);

  const closeModal = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  if (!open) return null;

  const payload = useMemo(() => {
    const baseMessage = message.trim() || placeholder;
    if (target === 'group') {
      return { target: 'group' as const, groupId: selectedGroup?.id, message: baseMessage };
    }
    if (target === 'maybe') {
      return { target: 'statuses' as const, statuses: ['MAYBE'], message: baseMessage };
    }
    return { target: 'statuses' as const, statuses: ['NA'], message: baseMessage };
  }, [target, selectedGroup, message, placeholder]);

  const sendReminder = useCallback(() => {
    if (!payload) return;
    setStatus('idle');
    setFeedback('');
    setResultSummary(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.ok) {
          const delivered = json?.result?.delivered ?? 0;
          const attempted = json?.result?.attempted ?? 0;
          const summary = attempted > 0 ? `נשלחו ${delivered} מתוך ${attempted} תזכורות.` : 'לא נמצאו נמענים מתאימים.';
          setResultSummary(summary);
          if (delivered > 0) {
            setStatus('success');
            setFeedback('התזכורות נשלחו בהצלחה.');
          } else {
            setStatus('error');
            setFeedback('לא נשלחו תזכורות – ייתכן שאין התקני Push זמינים אצל הנמענים.');
          }
        } else {
          setStatus('error');
          setFeedback(json?.error || 'שליחת התזכורת נכשלה.');
        }
      } catch (err) {
        console.error('[reminder-modal] failed', err);
        setStatus('error');
        setFeedback('שליחת התזכורת נכשלה.');
      }
    });
  }, [payload, eventId]);

  const availableTargets: TargetOption[] = useMemo(() => {
    const targets: TargetOption[] = [];
    targets.push('waiting');
    targets.push('maybe');
    if (groups.length) targets.push('group');
    return targets;
  }, [groups.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={closeModal} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl">
        <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">תזכורת RSVP</h2>
            <p className="text-xs text-gray-500">{eventTitle}</p>
          </div>
          <button type="button" onClick={closeModal} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white" aria-label="סגירת חלון">
            ✕
          </button>
        </header>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          <section className="px-4 py-3 space-y-2">
            <h3 className="text-sm font-semibold">בחרו למי לשלוח</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availableTargets.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setTarget(option);
                    setMessage('');
                  }}
                  className={`rounded border px-3 py-2 text-sm text-right transition ${target === option ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}
                >
                  <div className="font-medium">
                    {option === 'waiting' && `ממתינים (${waitingCount})`}
                    {option === 'maybe' && `מסומני "אולי" (${maybeCount})`}
                    {option === 'group' && 'קבוצה פנימית'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {option === 'waiting' && 'כל מי שעדיין לא אישר הגעה'}
                    {option === 'maybe' && 'כל מי שמסומן כ״אולי״'}
                    {option === 'group' && 'שלחו תזכורת לקבוצה פנימית אחת'}
                  </div>
                </button>
              ))}
            </div>
            {target === 'group' && groups.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="reminder-group">בחרו קבוצה</label>
                <select
                  id="reminder-group"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm"
                  disabled={isPending}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} · {group.waiting > 0 ? `${group.waiting} ממתינים` : `${group.total} משתתפים`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="px-4 py-3 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">מסר אישי</h3>
                  <span className="text-xs text-gray-500">{message.length}/{MAX_MESSAGE_LEN}</span>
                </div>
                <textarea
                  className="w-full rounded border border-gray-300 dark:border-gray->>
