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

  const statusActions = [
    {
      key: 'waiting',
      title: 'ממתינים לאישור',
      description: waitingCount > 0 ? `${waitingCount} עדיין לא אישרו השתתפות` : 'אין ממתינים כרגע',
      count: waitingCount,
      disabled: waitingCount === 0,
      action: () => sendReminder({ target: 'statuses', statuses: ['NA'], message: customMessage || undefined }, 'לא ניתן לשלוח תזכורת כרגע'),
      tone: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    },
    {
      key: 'maybe',
      title: 'מסומנים כ״אולי״',
      description: maybeCount > 0 ? `${maybeCount} עוד מתלבטים` : 'אף אחד לא מסומן כ״אולי״',
      count: maybeCount,
      disabled: maybeCount === 0,
      action: () => sendReminder({ target: 'statuses', statuses: ['MAYBE'], message: customMessage || undefined }, 'לא ניתן לשלוח תזכורת כרגע'),
      tone: 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300',
    },
  ];

  return (
    <section className="space-y-4 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">תזכורות RSVP</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {waitingCount > 0
            ? `${waitingCount} עדיין לא אישרו השתתפות באירוע "${eventTitle}"`
            : 'כל המשתתפים כבר הגיבו, אבל אפשר לשלוח תזכורת ידנית במקרה הצורך'}
        </p>
      </header>

      <div className="space-y-3">
        {statusActions.map((action) => (
          <div key={action.key} className="flex items-center justify-between gap-3 rounded border border-gray-200 dark:border-gray-800 px-3 py-2">
            <div className="text-sm">
              <div className="font-medium">{action.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{action.description}</div>
            </div>
            <button
              type="button"
              disabled={isPending || action.disabled}
              className={`px-3 py-2 rounded text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed transition ${action.tone}`}
              onClick={action.action}
            >
              {isPending ? 'שולח…' : 'שלחו תזכורת'}
            </button>
          </div>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="space-y-2 border-t border-dashed pt-3">
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
            className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm"
            onClick={() => sendReminder({ target: 'group', groupId: selectedGroup, message: customMessage || undefined }, 'לא ניתן לשלוח תזכורת לקבוצה כרגע')}
          >
            {isPending ? 'שולח…' : 'שלחו תזכורת לקבוצה'}
          </button>
        </div>
      )}

      <div className="space-y-1 border-t border-dashed pt-3">
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

