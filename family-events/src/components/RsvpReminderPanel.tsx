'use client';

import { useState, useTransition } from 'react';

type GroupOption = {
  id: string;
  name: string;
  waiting: number;
  total: number;
};

type Props = {
  eventId: string;
  eventTitle: string;
  waitingCount: number;
  maybeCount: number;
  groups: GroupOption[];
};

type Status = 'idle' | 'success' | 'error';

export default function RsvpReminderPanel({ eventId, eventTitle, waitingCount, maybeCount, groups }: Props) {
  const [customMessage, setCustomMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState('');
  const [isPending, startTransition] = useTransition();
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.id ?? '');

  function handleResult(json: any, fallback: string) {
    if (json?.ok && json?.result) {
      const delivered = json.result.delivered ?? 0;
      const attempted = json.result.attempted ?? 0;
      if (delivered > 0) {
        setStatus('success');
        setFeedback(`נשלחו ${delivered} מתוך ${attempted} תזכורות`);
      } else {
        setStatus('error');
        setFeedback('לא נשלחה תזכורת – ייתכן שאין התקני Push זמינים');
      }
    } else {
      setStatus('error');
      setFeedback(fallback);
    }
  }

  function sendReminder(payload: Record<string, unknown>, fallbackMsg: string) {
    setStatus('idle');
    setFeedback('');
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        handleResult(json, fallbackMsg);
      } catch (err) {
        console.error('[reminders] failed to send reminder', err);
        setStatus('error');
        setFeedback(fallbackMsg);
      }
    });
  }

  const messageLabel = customMessage.length ? ` (${customMessage.length} תווים)` : '';
  const disabledClass = 'opacity-50 pointer-events-none';

  return (
    <section className="space-y-3 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">תזכורות RSVP</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {waitingCount > 0
            ? `${waitingCount} עדיין לא אישרו השתתפות באירוע "${eventTitle}"`
            : 'כל המשתתפים כבר הגיבו, אבל אפשר לשלוח תזכורות ידניות'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || waitingCount === 0}
          className={`px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed ${waitingCount === 0 ? disabledClass : ''}`}
          onClick={() => sendReminder({ target: 'statuses', statuses: ['NA'], message: customMessage || undefined }, 'לא ניתן לשלוח תזכורת כרגע')}
        >
          שלחו תזכורת לממתינים ({waitingCount})
        </button>
        <button
          type="button"
          disabled={isPending || maybeCount === 0}
          className={`px-3 py-2 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300 disabled:cursor-not-allowed ${maybeCount === 0 ? disabledClass : ''}`}
          onClick={() => sendReminder({ target: 'statuses', statuses: ['MAYBE'], message: customMessage || undefined }, 'לא ניתן לשלוח תזכורת כרגע')}
        >
          תזכורת ל״אולי״ ({maybeCount})
        </button>
      </div>

      {groups.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            קבוצה פנימית
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-900"
              disabled={isPending}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {group.waiting > 0 ? `${group.waiting} ממתינים` : `${group.total} משתתפים`}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={isPending || !selectedGroup}
            className={`px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed ${!selectedGroup ? disabledClass : ''}`}
            onClick={() => sendReminder({ target: 'group', groupId: selectedGroup, message: customMessage || undefined }, 'לא ניתן לשלוח תזכורת לקבוצה כרגע')}
          >
            שלחו תזכורת לקבוצה
          </button>
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium" htmlFor="custom-reminder-message">מסר אישי{messageLabel}</label>
        <textarea
          id="custom-reminder-message"
          className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
          rows={2}
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value.slice(0, 160))}
          placeholder={'(לא חובה) לדוגמה: “הברביקיו מתחיל עוד שעה – מי מגיע?”'}
          disabled={isPending}
        />
        <p className="text-xs text-gray-500">השדה יתעלם אם הוזנו פחות מארבעה תווים. עד 160 תווים.</p>
      </div>

      {feedback && (
        <p className={`text-sm ${status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {feedback}
        </p>
      )}
    </section>
  );
}

