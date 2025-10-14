"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type Family = { id: string; name: string };

export default function FamilyMenu() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get('family') || '';

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

  function select(familyId: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (familyId) params.set('family', familyId);
    else params.delete('family');
    router.push(`${pathname}?${params.toString()}`);
  }

  if (loading || families.length === 0) return null;

  return (
    <div className="relative">
      <select
        className="px-2 py-1 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
        value={selected}
        onChange={(e) => select(e.target.value)}
      >
        <option value="">כל המשפחות</option>
        {families.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </div>
  );
}
