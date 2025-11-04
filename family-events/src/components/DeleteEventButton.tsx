"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Scope = 'single' | 'future' | 'series';

export default function DeleteEventButton({ id, occurrenceStartAt, seriesId }: { id: string; occurrenceStartAt?: string; seriesId?: string | null }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasSeries = !!seriesId;

  async function performDelete(scope: Scope) {
    const params = new URLSearchParams();
    if (scope && scope !== 'single') params.set('scope', scope);
    if (occurrenceStartAt) params.set('occurrenceStartAt', occurrenceStartAt);
    const url = params.size ? `/api/events/${id}?${params.toString()}` : `/api/events/${id}`;
    setDeleting(true);
    const res = await fetch(url, { method: 'DELETE' });
    setDeleting(false);
    setDialogOpen(false);
    if (res.ok) {
      router.replace('/events');
      router.refresh();
    }
  }

  async function handleSingleDelete() {
    const msg = occurrenceStartAt ? 'למחוק את המופע הזה בלבד? ניתן לשחזר בעריכה.' : 'למחוק את האירוע? פעולה זו בלתי הפיכה.';
    if (!confirm(msg)) return;
    await performDelete('single');
  }

  return (
    <>
      <button
        disabled={deleting}
        onClick={() => {
          if (hasSeries) setDialogOpen(true);
          else handleSingleDelete();
        }}
        className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-60"
      >
        {deleting ? 'מוחק…' : 'מחיקה'}
      </button>
      {dialogOpen && hasSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xl space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">כיצד למחוק?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">בחרו את ההיקף שברצונכם להסיר:</p>
            <div className="space-y-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => performDelete('single')}
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-right hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                מחיקה של האירוע הזה בלבד
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => performDelete('future')}
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-right hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                מחיקה של אירוע זה וכל הבאים
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  if (confirm('למחוק את כל הסדרה? פעולה זו תמחק את כל האירועים החוזרים.')) {
                    performDelete('series');
                  }
                }}
                className="w-full px-3 py-2 rounded-md border border-red-300 text-sm text-right text-red-600 hover:bg-red-50"
              >
                מחיקה של כל הסדרה
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </>
  );
}

