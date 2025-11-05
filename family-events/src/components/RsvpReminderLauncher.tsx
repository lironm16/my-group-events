'use client';

import { useMemo, useState } from 'react';
import RsvpReminderModal from '@/components/RsvpReminderModal';

type GroupOption = {
  id: string;
  name: string;
  waiting: number;
  total: number;
};

interface Props {
  eventId: string;
  eventTitle: string;
  waitingCount: number;
  maybeCount: number;
  groups: GroupOption[];
}

export default function RsvpReminderLauncher({ eventId, eventTitle, waitingCount, maybeCount, groups }: Props) {
  const [open, setOpen] = useState(false);

  const noTargets = useMemo(() => {
    const groupHasWaiting = groups.some((g) => g.waiting > 0 || g.total > 0);
    return waitingCount === 0 && maybeCount === 0 && !groupHasWaiting;
  }, [waitingCount, maybeCount, groups]);

  return (
    <div className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-3">
      <div>
        <h3 className="text-sm font-semibold">תזכורות RSVP</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          שלחו בקשת עדכון למי שלא אישר הגעה או עדיין מתלבט.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={noTargets}
        className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        שליחת תזכורת
      </button>
      <RsvpReminderModal
        eventId={eventId}
        eventTitle={eventTitle}
        open={open}
        onClose={() => setOpen(false)}
        waitingCount={waitingCount}
        maybeCount={maybeCount}
        groups={groups}
      />
    </div>
  );
}

