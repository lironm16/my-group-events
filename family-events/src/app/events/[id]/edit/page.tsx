"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DateTimePicker from '@/components/DateTimePicker';

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  externalLink: string | null;
};

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/events/${params.id}`, { cache: 'no-store' });
      if (!res.ok) {
        setError('אין הרשאה לערוך או שהאירוע לא נמצא');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const e: EventDetail = data.event;
      setForm({
        title: e.title,
        description: e.description ?? '',
        location: e.location ?? '',
        startAt: e.startAt ? new Date(e.startAt).toISOString().slice(0,16) : '',
        endAt: e.endAt ? new Date(e.endAt).toISOString().slice(0,16) : '',
        externalLink: e.externalLink ?? '',
      });
      setLoading(false);
    })();
  }, [params.id]);

  const errors = useMemo(() => {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.title.trim()) errs.title = 'יש להזין כותרת';
    if (!form.startAt) errs.startAt = 'יש להזין תאריך התחלה';
    if (form.endAt && form.startAt && new Date(form.endAt) < new Date(form.startAt)) errs.endAt = 'תאריך הסיום חייב להיות אחרי ההתחלה';
    if (form.externalLink && !/^https?:\/\//.test(form.externalLink)) errs.externalLink = 'קישור לא תקין (חייב להתחיל ב-http/https)';
    return errs;
  }, [form]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    // Save invite changes first (if any)
    try {
      const selEl = document.getElementById('invitesSelection') as HTMLInputElement | null;
      const initEl = document.getElementById('invitesInitial') as HTMLInputElement | null;
      if (selEl && initEl) {
        const selectedIds: string[] = JSON.parse(selEl.value || '[]');
        const initialIds: string[] = JSON.parse(initEl.value || '[]');
        const selectedSet = new Set<string>(selectedIds);
        const initialSet = new Set<string>(initialIds);
        const toAdd: string[] = [];
        const toRemove: string[] = [];
        for (const id of selectedSet) if (!initialSet.has(id)) toAdd.push(id);
        for (const id of initialSet) if (!selectedSet.has(id)) toRemove.push(id);
        if (toAdd.length || toRemove.length) {
          const updates = toAdd.map((uid) => ({ userId: uid, status: 'NA' }));
          await fetch('/api/rsvp/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: params.id, updates, remove: toRemove }),
          });
        }
      }
    } catch {}
    const res = await fetch(`/api/events/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) router.push(`/events/${params.id}`);
  }

  if (loading) return <main className="container-page">טוען…</main>;
  if (error) return <main className="container-page text-red-600">{error}</main>;

  const inputCls = "w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800";
  const errorCls = "text-xs text-red-600";

  return (
    <main className="container-page space-y-4">
      <h1 className="text-2xl font-bold">עריכת אירוע</h1>
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          <input className={inputCls} placeholder="כותרת" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          {errors.title && <p className={errorCls}>{errors.title}</p>}
        </div>
        <input className={inputCls} placeholder="תיאור" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <input className={inputCls} placeholder="מיקום" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
        <div>
          <DateTimePicker label="תאריך התחלה" value={form.startAt} onChange={(v)=>setForm({...form, startAt:v})} />
          {errors.startAt && <p className={errorCls}>{errors.startAt}</p>}
        </div>
        <div>
          <DateTimePicker label="תאריך סיום" value={form.endAt} onChange={(v)=>setForm({...form, endAt:v})} />
          {errors.endAt && <p className={errorCls}>{errors.endAt}</p>}
        </div>
        <div>
          <input className={inputCls} placeholder="קישור חיצוני (אופציונלי)" value={form.externalLink} onChange={e=>setForm({...form, externalLink:e.target.value})} />
          {errors.externalLink && <p className={errorCls}>{errors.externalLink}</p>}
        </div>
        <InvitesEditor eventId={params.id} />
        <div className="flex gap-2">
          <button disabled={saving || Object.keys(errors).length > 0} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? 'שומר…' : 'שמירה'}</button>
          <button type="button" onClick={()=>router.push(`/events/${params.id}`)} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">ביטול</button>
        </div>
      </form>
    </main>
  );
}
function InvitesEditor({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(true);
  type GroupNode = { id: string; nickname: string; parentId: string | null; members: { id: string; name: string | null; image: string | null }[] };
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [initialUserIds, setInitialUserIds] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [gRes, eRes] = await Promise.all([
          fetch('/api/family/groups', { cache: 'no-store' }),
          fetch(`/api/events/${eventId}`, { cache: 'no-store' }),
        ]);
        const gj = await gRes.json();
        const nodes: GroupNode[] = (gj.groups || [])
          .map((gr: any) => ({
            id: gr.id,
            nickname: gr.nickname,
            parentId: gr.parent?.id || null,
            members: (gr.members || []).map((u: any) => ({ id: u.id, name: u.name || null, image: u.image || null })),
          }))
          .filter((g: GroupNode) => g.members.length > 0);
        setGroups(nodes);
        const ej = await eRes.json();
        const currIds = new Set<string>((ej?.event?.rsvps || []).map((r: any) => r.userId));
        setInitialUserIds(currIds);
        // initialize selection based on current RSVPs
        const sel: Record<string, boolean> = {};
        for (const id of currIds) sel[id] = true;
        setSelectedUsers(sel);
        // precompute selected groups from users
        const sg: Record<string, boolean> = {};
        for (const g of nodes) {
          const allOn = g.members.every((m) => sel[m.id]);
          if (allOn) sg[g.id] = true;
        }
        setSelectedGroups(sg);
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

  function toggleUser(userId: string) {
    setSelectedUsers((s) => ({ ...s, [userId]: !s[userId] }));
  }

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) => {
      const on = !prev[groupId];
      const userIds = collectDescendantUserIds(groupId);
      setSelectedUsers((s) => {
        const ns = { ...s };
        for (const uid of userIds) ns[uid] = on;
        return ns;
      });
      return { ...prev, [groupId]: on };
    });
  }

  // Serialize selection to hidden inputs; the main save will process
  useEffect(() => {
    const selEl = document.getElementById('invitesSelection') as HTMLInputElement | null;
    const initEl = document.getElementById('invitesInitial') as HTMLInputElement | null;
    if (selEl) {
      const ids = Object.entries(selectedUsers).filter(([, v]) => v).map(([k]) => k);
      selEl.value = JSON.stringify(ids);
    }
    if (initEl) initEl.value = JSON.stringify(Array.from(initialUserIds));
  }, [selectedUsers, initialUserIds]);

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-300">טוען מוזמנים…</div>;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">מוזמנים</h3>
      <div className="space-y-3">
        {roots.map((root) => (
          <GroupItem key={root.id} node={root} level={0} byParent={byParent} selectedGroups={selectedGroups} onToggleGroup={toggleGroup} selectedUsers={selectedUsers} onToggleUser={toggleUser} />
        ))}
      </div>
      <input type="hidden" id="invitesSelection" />
      <input type="hidden" id="invitesInitial" />
    </div>
  );

  function GroupItem({ node, level, byParent, selectedGroups, onToggleGroup, selectedUsers, onToggleUser }: { node: GroupNode; level: number; byParent: Map<string | null, GroupNode[]>; selectedGroups: Record<string, boolean>; onToggleGroup: (id: string) => void; selectedUsers: Record<string, boolean>; onToggleUser: (id: string) => void; }) {
    const children = byParent.get(node.id) || [];
    return (
      <div className="rounded border border-gray-200 dark:border-gray-800 p-3">
        <label className="inline-flex items-center gap-2 mb-2">
          <input type="checkbox" checked={!!selectedGroups[node.id]} onChange={() => onToggleGroup(node.id)} />
          <span className="font-medium">{node.nickname}</span>
          {level > 0 && <span className="text-xs text-gray-500">תת־קבוצה</span>}
        </label>
        {node.members.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {node.members.map((u) => (
              <label key={u.id} className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-sm ${selectedUsers[u.id] ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-700 dark:border-blue-700 dark:text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.image && u.image.startsWith('http') ? u.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(u.name || 'user')}`} alt={u.name || ''} className="w-5 h-5" />
                <span>{u.name || ''}</span>
                <input type="checkbox" className="ml-1" checked={!!selectedUsers[u.id]} onChange={() => onToggleUser(u.id)} />
              </label>
            ))}
          </div>
        )}
        {children.length > 0 && (
          <div className="mt-3 space-y-3">
            {children.map((c) => (
              <GroupItem key={c.id} node={c} level={level + 1} byParent={byParent} selectedGroups={selectedGroups} onToggleGroup={onToggleGroup} selectedUsers={selectedUsers} onToggleUser={onToggleUser} />
            ))}
          </div>
        )}
      </div>
    );
  }
}


