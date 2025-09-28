"use client";
import { useMemo, useState } from 'react';
import CopyTools from '@/components/CopyTools';

type PendingMember = { id: string; name: string | null; phone: string; groupId?: string | null; groupName?: string | null };

export default function PendingWhatsApp({
  title,
  dateText,
  locText,
  shareUrl,
  pending,
}: {
  title: string;
  dateText: string;
  locText: string;
  shareUrl: string;
  pending: PendingMember[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pending) {
      if (p.groupId && p.groupName) map.set(p.groupId, p.groupName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [pending]);

  const [selected, setSelected] = useState<string[]>(groups.map(g => g.id));

  const filtered = useMemo(() => {
    if (selected.length === 0) return [] as PendingMember[];
    if (selected.length === groups.length) return pending;
    const sel = new Set(selected);
    return pending.filter(p => (p.groupId ? sel.has(p.groupId) : true));
  }, [pending, selected, groups.length]);

  const perUserMsg = (name?: string | null) => `היי${name ? ' ' + name : ''}! 🙌\nמזכירים לאשר הגעה ל"${title}"\n🗓️ ${dateText} ${locText}\nלאישור: ${shareUrl}`;
  const bulkMsg = `🙌 תזכורת לאישור הגעה ל"${title}"\n🗓️ ${dateText} ${locText}\nלאישור: ${shareUrl}`;
  const numbers = filtered.map(p => p.phone);

  function toggleAll(on: boolean) {
    setSelected(on ? groups.map(g => g.id) : []);
  }

  function toggleOne(id: string) {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.length === groups.length} onChange={e => toggleAll(e.target.checked)} />
          בחר הכל
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          {groups.map(g => (
            <label key={g.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
              <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggleOne(g.id)} />
              <span>{g.name}</span>
            </label>
          ))}
        </div>
      </div>
      <CopyTools numbers={numbers} message={bulkMsg} />
      <ul className="space-y-2">
        {filtered.map(p => (
          <li key={p.id} className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-900">
            <span>{p.name || p.phone}{p.groupName ? ` · ${p.groupName}` : ''}</span>
            <a className="px-3 py-1 bg-green-600 text-white rounded" href={`https://wa.me/${encodeURIComponent(p.phone)}?text=${encodeURIComponent(perUserMsg(p.name))}`} target="_blank" rel="noreferrer">תזכורת</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

