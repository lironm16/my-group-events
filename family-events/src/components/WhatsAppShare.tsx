"use client";
import { useMemo, useState } from 'react';

type Props = {
  eventId: string;
  title: string;
  startAtISO: string;
  location: string | null;
  typeKey: string | null;
  shareUrl: string; // full URL to the event page
  hasResponders?: boolean; // legacy: when true, hide reminder variants (kept for compat)
  includeReminders?: boolean; // when true, include reminder-oriented variants
};

export default function WhatsAppShare({ eventId, title, startAtISO, location, typeKey, shareUrl, hasResponders = true, includeReminders = false }: Props) {
  const [idx, setIdx] = useState(0);

  const dateText = useMemo(() => {
    // If the event has no time (date-only), avoid adding a time in the message
    if (/T00:00:00\.000Z$/.test(startAtISO)) {
      return new Date(startAtISO).toLocaleDateString('he-IL', { dateStyle: 'full' });
    }
    return new Date(startAtISO).toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' });
  }, [startAtISO]);
  const locText = location ? `במקום: ${location}\n` : '';

  const variants = useMemo(() => buildVariants({ title, dateText, locText, shareUrl, typeKey, includeReminders: includeReminders || !hasResponders }), [title, dateText, locText, shareUrl, typeKey, includeReminders, hasResponders]);
  const text = variants[idx]?.text ?? variants[0]?.text ?? '';

  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-sm text-gray-600 dark:text-gray-300">סוג הודעה</label>
      <select
        className="border rounded px-2 py-1 bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-sm"
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        aria-label="בחירת סוג הודעת ווצאפ"
      >
        {variants.map((v, i) => (
          <option key={i} value={i}>{v.label}</option>
        ))}
      </select>
      <button
        type="button"
        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        onClick={async () => {
          if ((navigator as any).share) {
            try { await (navigator as any).share({ text }); return; } catch {}
          }
          window.open(waHref, '_blank');
        }}
        aria-label="שיתוף הודעת ווצאפ"
      >וואטסאפ</button>
      <button
        type="button"
        className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        onClick={async () => { try { await navigator.clipboard.writeText(text); } catch {} }}
      >העתקה</button>
      <a className="px-2 py-1 border rounded text-sm bg-gray-100 dark:bg-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700"
        href={waHref}
        target="_blank"
        rel="noreferrer"
      >פתיחה</a>
      <div className="hidden sm:block text-xs text-gray-600 dark:text-gray-400 max-w-[360px] truncate" title={text.replace(/\n/g, ' ')}>
        תצוגה מקדימה: {text.replace(/\n/g, ' ')}
      </div>
    </div>
  );
}

function buildVariants({ title, dateText, locText, shareUrl, typeKey, includeReminders }: { title: string; dateText: string; locText: string; shareUrl: string; typeKey: string | null; includeReminders: boolean }) {
  const variants: { label: string; text: string }[] = [];
  // Type-specific lead
  if (typeKey === 'shabat_eve') {
    variants.push({ label: 'שיתוף – ערב שבת', text: `🕯️ ערב שבת משפחתי – ${title}\n🗓️ ${dateText}\n${locText}אישור הגעה: ${shareUrl}` });
  } else if (typeKey === 'holiday_eve') {
    variants.push({ label: 'שיתוף – ערב חג', text: `✨ ערב חג – ${title}\n🗓️ ${dateText}\n${locText}אישור הגעה: ${shareUrl}` });
  } else if (typeKey === 'holiday') {
    variants.push({ label: 'שיתוף – חג', text: `🌟 חג – ${title}\n🗓️ ${dateText}\n${locText}אישור הגעה: ${shareUrl}` });
  }
  // Core variants
  variants.push(
    { label: 'פרטי האירוע', text: `📅 ${title}\n🕒 ${dateText}\n${locText}\nאישור/פרטים:\n${shareUrl}` },
    { label: 'פתיחה ידידותית', text: `🎉 היי! מוזמנים ל"${title}"\n🗓️ ${dateText}\n${locText}פרטים ואישור: ${shareUrl}` },
    { label: 'מחכים לכם', text: `🙌 מחכים לכם ב"${title}"!\n${locText}מתי: ${dateText}\nאישור כאן: ${shareUrl}` },
  );
  if (includeReminders) {
    variants.push(
      { label: 'תזכורת ידידותית', text: `⏰ תזכורת קצרה לאישור הגעה ל"${title}"\n🗓️ ${dateText}\n${locText}לאישור במהירות: ${shareUrl}` },
      { label: 'בודקים שלא פספסתם', text: `🙂 רק בודקים שלא פספסתם – נשמח לאישור ל"${title}"\n${locText}אישור: ${shareUrl}` },
    );
  }
  // Deduplicate by text and cap to reasonable amount
  const seen = new Set<string>();
  const out: { label: string; text: string }[] = [];
  for (const v of variants) {
    if (seen.has(v.text)) continue;
    seen.add(v.text);
    out.push(v);
    if (out.length >= (includeReminders ? 6 : 4)) break;
  }
  return out;
}

