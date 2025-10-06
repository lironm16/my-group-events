"use client";
import { useEffect, useState } from 'react';

type Group = { id: string; nickname: string };

export default function GroupMenu() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, groupsRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/family/groups'),
        ]);
        const me = await meRes.json();
        const gs = await groupsRes.json();
        setActive(me?.user?.groupId || '');
        setGroups((gs?.groups || []).map((g: any) => ({ id: g.id, nickname: g.nickname })));
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function select(groupId: string) {
    setActive(groupId);
    try {
      await fetch('/api/users/group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: groupId || null }) });
      // Optionally refresh current page data
      if (typeof window !== 'undefined') window.location.reload();
    } catch {}
  }

  if (loading || groups.length === 0) return null;

  return (
    <div className="relative">
      <select
        className="px-2 py-1 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
        value={active || ''}
        onChange={(e) => select(e.target.value)}
      >
        <option value="">כל המשפחה</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.nickname}</option>
        ))}
      </select>
    </div>
  );
}

