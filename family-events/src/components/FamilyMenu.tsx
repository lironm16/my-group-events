"use client";
import { useEffect, useState } from 'react';

type Family = { id: string; name: string };

export default function FamilyMenu() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [active, setActive] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/families', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          setFamilies((j?.families || []).map((f: any) => ({ id: f.id, name: f.name })));
          setActive(j?.activeFamilyId || '');
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function select(familyId: string) {
    setActive(familyId);
    try {
      await fetch('/api/users/family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId }) });
      if (typeof window !== 'undefined') window.location.reload();
    } catch {}
  }

  if (loading || families.length === 0) return null;

  return (
    <div className="relative">
      <select
        className="px-2 py-1 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
        value={active || ''}
        onChange={(e) => select(e.target.value)}
      >
        {families.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </div>
  );
}
