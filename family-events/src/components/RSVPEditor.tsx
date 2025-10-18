"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Four-state RSVP
type Status = "APPROVED" | "DECLINED" | "MAYBE" | "NA";

// Group node as used in create-event mapping
type GroupNode = {
  id: string;
  nickname: string;
  parentId: string | null;
  members: { id: string; name: string | null; image: string | null }[];
};

export default function RSVPEditor({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; groupId: string | null } | null>(null);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [statusByUser, setStatusByUser] = useState<Map<string, { status: Status; note: string | null }>>(new Map());
  const [changes, setChanges] = useState<Record<string, { status: Status; note?: string | null }>>({});

  useEffect(() => {
    (async () => {
      try {
        const [meRes, grpRes, evRes] = await Promise.all([
          fetch('/api/users/me', { cache: 'no-store' }),
          fetch('/api/family/groups', { cache: 'no-store' }),
          fetch(`/api/events/${eventId}`, { cache: 'no-store' }),
        ]);
        const meJ = await meRes.json();
        setMe({ id: meJ?.user?.id || '', groupId: meJ?.user?.groupId || null });
        const ev = await evRes.json();
        const map = new Map<string, { status: Status; note: string | null }>();
        const rsvps = ((ev?.event?.rsvps || []) as any[]);
        for (const r of rsvps) map.set(r.userId, { status: (r.status as Status) || 'NA', note: r.note ?? null });
        setStatusByUser(map);
        const invited = new Set<string>(rsvps.map((r: any) => r.userId));
        const gj = await grpRes.json();
        // Build group nodes, filtering members to only invited users (if any invites exist)
        let nodes: GroupNode[] = (gj.groups || []).map((gr: any) => ({
          id: gr.id,
          nickname: gr.nickname,
          parentId: gr.parent?.id || null,
          members: (gr.members || [])
            .filter((u: any) => invited.size === 0 || invited.has(u.id))
            .map((u: any) => ({ id: u.id, name: u.name || null, image: u.image || null })),
        }));
        // Hide groups that have no invited members AND no invited members in any descendant
        if (invited.size > 0) {
          const byIdTemp = new Map<string, GroupNode>();
          nodes.forEach((g) => byIdTemp.set(g.id, g));
          const hasInvitedInSubtree = new Map<string, boolean>();
          function check(gid: string): boolean {
            if (hasInvitedInSubtree.has(gid)) return hasInvitedInSubtree.get(gid)!;
            const node = byIdTemp.get(gid);
            if (!node) return false;
            if ((node.members || []).length > 0) { hasInvitedInSubtree.set(gid, true); return true; }
            // Recursively check children
            const children = nodes.filter((n) => n.parentId === gid);
            const ok = children.some((c) => check(c.id));
            hasInvitedInSubtree.set(gid, ok);
            return ok;
          }
          const keepIds = new Set<string>();
          nodes.forEach((g) => { if (check(g.id)) keepIds.add(g.id); });
          nodes = nodes.filter((g) => keepIds.has(g.id));
        }
        setGroups(nodes);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const byId = useMemo(() => {
    const map = new Map<string, GroupNode>();
    groups.forEach((g) => map.set(g.id, g));
    return map;
  }, [groups]);
  const byParent = useMemo(() => {
    const map = new Map<string | null, GroupNode[]>();
    groups.forEach((g) => {
      const key = g.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return map;
  }, [groups]);
  const roots = useMemo(() => byParent.get(null) || [], [byParent]);

  function getUserStatus(userId: string): Status {
    return (changes[userId]?.status ?? statusByUser.get(userId)?.status ?? 'NA') as Status;
  }

  function getUserNote(userId: string): string | null {
    const c = changes[userId]?.note;
    if (c != null) return c as string | null;
    return statusByUser.get(userId)?.note ?? null;
  }

  function setUserStatus(userId: string, next: Status) {
    setChanges((c) => ({ ...c, [userId]: { status: next, note: c[userId]?.note ?? statusByUser.get(userId)?.note ?? null } }));
  }

  function canEditUser(userId: string): boolean {
    if (!me) return false;
    if (userId === me.id) return true;
    // Server will enforce; allow UI edits for now
    return true;
  }

  function collectDescendantUserIds(groupId: string): string[] {
    const res: string[] = [];
    const stack: string[] = [groupId];
    while (stack.length) {
      const gid = stack.pop()!;
      const node = byId.get(gid);
      if (!node) continue;
      node.members.forEach((u) => res.push(u.id));
      const children = byParent.get(gid) || [];
      children.forEach((c) => stack.push(c.id));
    }
    return res;
  }

  function quickApply(groupId: string, status: Status, onlyNA: boolean) {
    const users = collectDescendantUserIds(groupId);
    setChanges((c) => {
      const out = { ...c } as Record<string, { status: Status; note?: string | null }>;
      for (const uid of users) {
        const curr = statusByUser.get(uid)?.status ?? 'NA';
        if (onlyNA && curr !== 'NA' && !out[uid]) continue;
        out[uid] = { status, note: out[uid]?.note ?? statusByUser.get(uid)?.note ?? null };
      }
      return out;
    });
  }

  const pendingCount = useMemo(() => {
    let n = 0;
    for (const [uid, change] of Object.entries(changes)) {
      const base = statusByUser.get(uid);
      if (!base) {
        // New RSVP row: count if status changed from implicit NA or if a note was added
        if (change.status !== 'NA' || ((change.note ?? '').trim() !== '')) n++;
        continue;
      }
      if (base.status !== change.status || (base.note ?? '') !== (change.note ?? '')) n++;
    }
    return n;
  }, [changes, statusByUser]);

  async function save() {
    const updates = Object.entries(changes)
      .filter(([uid, change]) => {
        const base = statusByUser.get(uid);
        return !base || base.status !== change.status || (base.note ?? '') !== (change.note ?? '');
      })
      .map(([userId, change]) => ({ userId, status: change.status, note: (change.note ?? null) as string | null }));
    if (updates.length === 0) { setOpen(false); return; }
    const res = await fetch('/api/rsvp/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, updates }) });
    if (res.ok) {
      setOpen(false);
      setChanges({});
      router.refresh();
    }
  }

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">עריכת אישורי הגעה</h2>
        <button onClick={() => setOpen((o) => !o)} className="px-3 py-1 rounded border text-sm">{open ? 'סגור' : 'פתח'}</button>
      </div>
      {open && (
        <div className="space-y-3">
          {roots.map((root) => (
            <GroupItem
              key={root.id}
              node={root}
              level={0}
              byParent={byParent}
              onQuickApply={quickApply}
            onGroupNote={(userIds, note) => {
                setChanges((c) => {
                  const out = { ...c } as Record<string, { status: Status; note?: string | null }>;
                  for (const uid of userIds) {
                    const base = statusByUser.get(uid);
                    const currentStatus = out[uid]?.status ?? base?.status ?? 'NA';
                    out[uid] = { status: currentStatus, note };
                  }
                  return out;
                });
              }}
              getStatus={getUserStatus}
              getNote={getUserNote}
              setStatus={setUserStatus}
              canEdit={canEditUser}
            />
          ))}
          <div className="sticky bottom-0 left-0 right-0 z-30">
            <div className="max-w-6xl mx-auto px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">{pendingCount} שינויים ממתינים</span>
              <div className="flex gap-2">
                <button onClick={()=>{ setChanges({}); setOpen(false); }} className="px-3 py-2 rounded border">ביטול</button>
                <button onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60" disabled={pendingCount === 0}>שמירה</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupItem({ node, level, byParent, onQuickApply, onGroupNote, getStatus, getNote, setStatus, canEdit }: { node: GroupNode; level: number; byParent: Map<string | null, GroupNode[]>; onQuickApply: (id: string, s: Status, onlyNA: boolean) => void; onGroupNote: (userIds: string[], note: string) => void; getStatus: (userId: string) => Status; getNote: (userId: string) => string | null; setStatus: (userId: string, s: Status) => void; canEdit: (userId: string) => boolean }) {
  const children = byParent.get(node.id) || [];
  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{node.nickname}{level > 0 && <span className="text-xs text-gray-500"> · תת־קבוצה</span>}</div>
        <div className="flex items-center gap-2 text-xs">
          <select className="px-2 py-1 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" onChange={(e)=> onQuickApply(node.id, e.target.value as Status, true)} defaultValue="__">
            <option value="__" disabled>בחר</option>
            <option value="APPROVED">מגיע/ה</option>
            <option value="MAYBE">אולי</option>
            <option value="DECLINED">לא</option>
          </select>
          <button className="px-2 py-1 rounded border" onClick={()=> onQuickApply(node.id, 'NA', false)}>אפס</button>
        </div>
      </div>
      {node.members.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {node.members.map((u) => (
            <li key={u.id} className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.image && u.image.startsWith('http') ? u.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(u.name || 'user')}`} alt={u.name || ''} className="w-5 h-5 rounded-full" />
              <span>{u.name || '—'}</span>
              <StatusPicker value={getStatus(u.id)} disabled={!canEdit(u.id)} onChange={(s)=> setStatus(u.id, s)} />
              {(() => { const note = getNote(u.id); return note ? <span className="text-xs text-gray-500 italic truncate max-w-[12rem]">“{note}”</span> : null; })()}
            </li>
          ))}
        </ul>
      )}
      {children.length > 0 && (
        <div className="mt-3 space-y-3">
          {children.map((c) => (
            <GroupItem
              key={c.id}
              node={c}
              level={level + 1}
              byParent={byParent}
              onQuickApply={onQuickApply}
              onGroupNote={onGroupNote}
              getStatus={getStatus}
              getNote={getNote}
              setStatus={setStatus}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
      <div className="mt-3">
        <input
          className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs"
          placeholder="הערה (אופציונלי)"
          onChange={(e)=> {
            const val = e.target.value;
            const users = node.members.map(m=>m.id);
            onGroupNote(users, val);
          }}
        />
      </div>
    </div>
  );
}

function StatusPicker({ value, onChange, disabled }: { value: Status; onChange: (s: Status) => void; disabled?: boolean }) {
  const opts: { key: Status; label: string; cls: string }[] = [
    { key: 'APPROVED', label: 'מגיע/ה', cls: 'bg-green-600 text-white' },
    { key: 'MAYBE', label: 'אולי', cls: 'bg-yellow-500 text-white' },
    { key: 'DECLINED', label: 'לא', cls: 'bg-red-600 text-white' },
    { key: 'NA', label: '—', cls: 'bg-gray-500 text-white' },
  ];
  return (
    <div className="inline-flex items-center gap-1">
      {opts.map(o => (
        <button key={o.key} disabled={disabled} onClick={() => onChange(o.key)} className={[ 'px-2 py-0.5 rounded text-xs border', value === o.key ? o.cls + ' border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700' ].join(' ')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
