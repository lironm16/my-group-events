"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteEventButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  async function del() {
    if (!confirm('למחוק את האירוע? פעולה זו בלתי הפיכה.')) return;
    setDeleting(true);
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
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

