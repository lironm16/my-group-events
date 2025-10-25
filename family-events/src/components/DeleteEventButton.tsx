"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteEventButton({ id, occurrenceStartAt }: { id: string; occurrenceStartAt?: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  async function del() {
    const msg = occurrenceStartAt ? 'למחוק את המופע הזה בלבד? ניתן לשחזר ע"י עריכה.' : 'למחוק את האירוע? פעולה זו בלתי הפיכה.';
    if (!confirm(msg)) return;
    setDeleting(true);
    const url = occurrenceStartAt ? `/api/events/${id}?occurrenceStartAt=${encodeURIComponent(occurrenceStartAt)}` : `/api/events/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) {
      router.replace('/events');
      router.refresh();
    }
  }
  return (
    <button disabled={deleting} onClick={del} className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-60">
      {deleting ? 'מוחק…' : 'מחיקה'}
    </button>
  );
}

