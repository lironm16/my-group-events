"use client";
import { useMemo, useState } from 'react';

type Props = {
  eventId: string;
  title: string;
  startAtISO: string;
  location: string | null;
  typeKey: string | null;
  shareUrl: string; // full URL to the event page
};

export default function WhatsAppShare({ eventId, title, startAtISO, location, typeKey, shareUrl }: Props) {
  const [idx, setIdx] = useState(0);

  const dateText = useMemo(() => {
    // If the event has no time (date-only), avoid adding a time in the message
    if (/T00:00:00\.000Z$/.test(startAtISO)) {
      return new Date(startAtISO).toLocaleDateString('he-IL', { dateStyle: 'full' });
    }
    return new Date(startAtISO).toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' });
  }, [startAtISO]);
  const locText = location ? `במקום: ${location}\n` : '';

  const variants = useMemo(() => buildTemplates({ title, dateText, locText, shareUrl, typeKey }), [title, dateText, locText, shareUrl, typeKey]);
  const text = variants[idx] ?? variants[0];

  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex items-center gap-2">
      <select className="border rounded px-2 py-1 bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-sm"
        value={idx}
        onChange={e => setIdx(Number(e.target.value))}
        aria-label="בחירת ניסוח הודעה">
        {variants.map((_, i) => (
          <option key={i} value={i}>נוסח {i+1}</option>
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

function buildTemplates({ title, dateText, locText, shareUrl, typeKey }: { title: string; dateText: string; locText: string; shareUrl: string; typeKey: string | null }) {
  const base = [
    `📅 ${title}\n🕒 ${dateText}\n${locText}\nהצטרפו/אשרו כאן:\n${shareUrl}`,
    `🎉 היי! מוזמנים ל"${title}" ביום ${dateText.split(',')[0]} בשעה ${dateText.split(' ')[dateText.split(' ').length-1]}\n${locText}פרטים ואישור הגעה: ${shareUrl}`,
    `🙌 מחכים לכם ב"${title}"!\n${locText}מתי: ${dateText}\nאישור הגעה כאן: ${shareUrl}`,
  ];
  if (typeKey === 'shabat_eve') {
    base.unshift(`🕯️ ערב שבת משפחתי – ${title}\n🗓️ ${dateText}\n${locText}אישור הגעה: ${shareUrl}`);
  } else if (typeKey === 'holiday_eve') {
    base.unshift(`✨ ערב חג – ${title}\n🗓️ ${dateText}\n${locText}אישור הגעה: ${shareUrl}`);
  } else if (typeKey === 'holiday') {
    base.unshift(`🌟 חג – ${title}\n🗓️ ${dateText}\n${locText}אישור הגעה: ${shareUrl}`);
  }
  return base.slice(0, 4);
}

