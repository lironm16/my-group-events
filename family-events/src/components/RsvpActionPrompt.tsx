"use client";

import { useMemo, useState } from 'react';
import RSVPButtons from '@/components/RSVPButtons';

type RSVPStatus = 'APPROVED' | 'DECLINED' | 'MAYBE' | 'NA';

const statusLabels: Record<RSVPStatus, { title: string; description: string; tone: 'pending' | 'confirmed' | 'declined' | 'maybe'; }> = {
  APPROVED: {
    title: 'אישרתם הגעה',
    description: 'אפשר לעדכן את המארחים אם משהו משתנה.',
    tone: 'confirmed',
  },
  DECLINED: {
    title: 'סימנתם שלא תגיעו',
    description: 'אם התכניות השתנו – תוכלו לעדכן כאן.',
    tone: 'declined',
  },
  MAYBE: {
    title: 'עדיין לא סגורים',
    description: 'כשתדעו – עדכנו כדי שנוכל להיערך נכון.',
    tone: 'maybe',
  },
  NA: {
    title: 'עדיין לא אישרתם הגעה',
    description: 'ספרו למארחים אם אתם מצטרפים או לא.',
    tone: 'pending',
  },
};

export default function RsvpActionPrompt({ eventId, status, note, groupNote, canGroup, canAll }: { eventId: string; status: RSVPStatus; note?: string | null; groupNote?: string | null; canGroup: boolean; canAll: boolean }) {
  const [open, setOpen] = useState(false);
  const tone = statusLabels[status];
  const existingNote = (note ?? '').trim();
  const intent = useMemo(() => {
    switch (tone.tone) {
      case 'confirmed':
        return 'border-green-400/70 bg-green-50 dark:bg-green-900/20 dark:border-green-700 text-green-900 dark:text-green-100';
      case 'declined':
        return 'border-red-400/70 bg-red-50 dark:bg-red-900/20 dark:border-red-700 text-red-900 dark:text-red-100';
      case 'maybe':
        return 'border-yellow-400/70 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600 text-yellow-900 dark:text-yellow-100';
      default:
        return 'border-amber-400/70 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-900 dark:text-amber-100';
    }
  }, [tone.tone]);

  return (
    <>
      <div className={`rounded border px-3 py-3 sm:px-4 sm:py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${intent}`}>
        <div>
          <div className="font-medium text-sm sm:text-base">{tone.title}</div>
          <div className="text-xs sm:text-sm opacity-80 mt-1">{tone.description}</div>
          {existingNote && (
            <div className="text-xs sm:text-sm opacity-90 mt-2">
              הערה שהשארתם: <span className="font-medium">{existingNote}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:ml-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm sm:text-base hover:bg-blue-700 transition-colors"
          >
            {status === 'NA' ? 'להגיב להזמנה' : 'עדכון תשובה'}
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">עדכון RSVP</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                aria-label="סגירת חלון"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <RSVPButtons
                eventId={eventId}
                initial={status}
                initialNote={existingNote}
                initialGroupNote={groupNote ?? ''}
                canGroup={canGroup}
                canAll={canAll}
                onSaved={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
