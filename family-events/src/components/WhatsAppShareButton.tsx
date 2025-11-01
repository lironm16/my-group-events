"use client";

import { useState } from 'react';
import WhatsAppShare from '@/components/WhatsAppShare';

type Props = {
  eventId: string;
  title: string;
  startAtISO: string;
  location: string | null;
  shareUrl: string;
  typeKey?: string | null;
  hasResponders: boolean;
  includeReminders: boolean;
};

export default function WhatsAppShareButton({ eventId, title, startAtISO, location, shareUrl, typeKey, hasResponders, includeReminders }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-2 sm:px-3 py-2 text-sm rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
        aria-label="שיתוף בוואטסאפ"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2a9.94 9.94 0 0 0-8.57 15.14L2 22l4.99-1.46A9.97 9.97 0 1 0 12.04 2Zm0 18a7.95 7.95 0 0 1-4.07-1.11l-.29-.17-2.96.86.85-2.88-.19-.3A7.94 7.94 0 1 1 12.04 20Zm4.37-5.36c-.24-.12-1.41-.7-1.63-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.48 6.48 0 0 1-1.91-1.18 7.2 7.2 0 0 1-1.33-1.65c-.14-.24 0-.37.1-.49.1-.1.24-.28.36-.42s.16-.24.24-.4a.43.43 0 0 0 0-.42c-.06-.12-.54-1.29-.74-1.77s-.39-.41-.54-.42h-.46a.88.88 0 0 0-.63.29 2.64 2.64 0 0 0-.82 1.95 4.61 4.61 0 0 0 1 2.46c.06.08 1.32 2.02 3.2 2.84s2.63.7 3.1.66a2.62 2.62 0 0 0 1.72-1.25 2.15 2.15 0 0 0 .16-1.25c-.07-.08-.26-.12-.5-.24Z" />
        </svg>
        <span className="hidden sm:inline">וואטסאפ</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">שיתוף בוואטסאפ</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-xl leading-none"
                aria-label="סגירת חלון השיתוף"
              >
                ×
              </button>
            </div>
            <WhatsAppShare
              eventId={eventId}
              title={title}
              startAtISO={startAtISO}
              location={location}
              typeKey={typeKey ?? null}
              shareUrl={shareUrl}
              hasResponders={hasResponders}
              includeReminders={includeReminders}
            />
          </div>
        </div>
      )}
    </>
  );
}
