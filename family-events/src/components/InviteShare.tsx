"use client";
import { useMemo, useState } from 'react';

export default function InviteShare({ familyName, shareUrl }: { familyName?: string | null; shareUrl: string }) {
  const [idx, setIdx] = useState(0);
  const variants = useMemo(() => {
    const label = familyName && familyName.trim() ? ` "${familyName.trim()}"` : '';
    return [
      `הצטרפו לקבוצה${label} באפליקציה. כל האירועים והעדכונים במקום אחד:\n${shareUrl}`,
      `מזמין/ה אתכם להצטרף לקבוצה${label}.\nלחצו כאן להרשמה: ${shareUrl}`,
      `בואו לקבוצה${label}! כאן מתאמים אירועים, משתפים תמונות ונשארים מעודכנים.\nהצטרפות: ${shareUrl}`,
      `נשמח שתהיו איתנו בקבוצה${label}.\nהצטרפות מיידית בקישור: ${shareUrl}`,
      `היי! הקבוצה שלנו פתוחה להצטרפות${label} – הנה הקישור:\n${shareUrl}`,
    ];
  }, [familyName, shareUrl]);

  const text = variants[idx] ?? variants[0];
  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded px-2 py-1 bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-sm"
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        aria-label="בחירת ניסוח הודעה"
      >
        {variants.map((_, i) => (
          <option key={i} value={i}>נוסח {i + 1}</option>
        ))}
      </select>
      <button
        type="button"
        className="px-3 py-2 bg-green-600 text-white rounded"
        onClick={async () => {
          if (navigator.share) {
            try { await navigator.share({ text }); return; } catch {}
          }
          window.open(waHref, '_blank');
        }}
      >שיתוף בוואטסאפ</button>
      <a className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded" href={waHref} target="_blank" rel="noreferrer">פתיחה ישירה</a>
    </div>
  );
}
