"use client";
import { useMemo, useState, useEffect } from 'react';
import EventTypeIcon from '@/components/EventTypeIcon';
import DateTimePicker from '@/components/DateTimePicker';
import Script from 'next/script';

export default function NewEventPage() {
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '', image: '' });
  const [me, setMe] = useState<{ id: string; name: string | null } | null>(null);
  const [hostId, setHostId] = useState<string>('');
  const [coHostIds, setCoHostIds] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState('');
  const [skipHolidays, setSkipHolidays] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const body: any = { ...form, holidayKey: (window as any).__holidayKey ?? null };
    try {
      const input = document.getElementById('guestSelection') as HTMLInputElement | null;
      if (input && input.value) body.guestSelection = input.value;
    } catch {}
    if (hostId) body.hostId = hostId;
    if (Array.isArray(coHostIds) && coHostIds.length) body.coHostIds = coHostIds;
    if (repeatWeekly && repeatUntil) {
      body.repeat = { weeklyUntil: repeatUntil, skipHolidays };
    }
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      const { event } = await res.json();
      try {
        const base = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
        const shareUrl = `${base}/events/${event.id}`;
        const text = `🎉 נוצר אירוע חדש: ${form.title}\nאישור הגעה: ${shareUrl}`;
        if (navigator.share) await navigator.share({ text });
      } catch {}
      window.location.href = '/events';
    }
  }

  const inputCls = "w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800";
  const errorCls = "text-xs text-red-600";

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/users/me', { cache: 'no-store' });
        const j = await r.json();
        const my = { id: j?.user?.id || '', name: j?.user?.name || null };
        setMe(my);
        setHostId(my.id);
      } catch {}
    })();
  }, []);

  return (
    <main className="container-page space-y-4">
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=he`}
          strategy="afterInteractive"
        />
      )}
      <h1 className="text-2xl font-bold">אירוע חדש</h1>
      {step === 1 && (
      <TemplatesTiles onPick={(tpl)=>{
        setForm({
          title: tpl.title,
          description: tpl.description ?? '',
          location: tpl.location ?? '',
          startAt: tpl.startAt ?? '',
          endAt: tpl.endAt ?? '',
          externalLink: '',
          image: ''
        });
        (window as any).__holidayKey = tpl.holidayKey ?? null;
        setStep(2);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      }} />
      )}
      {step === 2 && (
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          {(!form.title || !form.title.trim()) && <div className="text-xs text-gray-500 mb-1">הזינו כותרת לאירוע</div>}
          <input className={inputCls} value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          {errors.title && <p className={errorCls}>{errors.title}</p>}
        </div>
        <div>
          {(!form.description || !form.description.trim()) && <div className="text-xs text-gray-500 mb-1">כמה מילים על האירוע</div>}
          <textarea rows={3} className={inputCls} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">מארח</div>
          <HostSelector value={hostId} onChange={setHostId} />
        </div>
        <CoHostsSelector selected={coHostIds} onChange={setCoHostIds} excludeId={hostId} />
        <PlacesInput value={form.location} onChange={(v)=>setForm({...form, location:v})} />
        <div>
          <DateTimePicker label="תאריך התחלה" value={form.startAt} onChange={(v)=>setForm({...form, startAt:v})} allowDateOnly timeToggle />
          {errors.startAt && <p className={errorCls}>{errors.startAt}</p>}
        </div>
        <div>
          <DateTimePicker label="תאריך סיום (אופציונלי)" value={form.endAt} onChange={(v)=>setForm({...form, endAt:v})} allowDateOnly timeToggle />
          {errors.endAt && <p className={errorCls}>{errors.endAt}</p>}
        </div>
        <div className="mt-4 space-y-2">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={repeatWeekly} onChange={(e)=>setRepeatWeekly(e.target.checked)} />
            <span>חזרה כל שבוע</span>
          </label>
          {repeatWeekly && (
            <div className="space-y-2">
              <DateTimePicker label="עד תאריך" value={repeatUntil} onChange={setRepeatUntil} />
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={skipHolidays} onChange={(e)=>setSkipHolidays(e.target.checked)} />
                <span>דלג על חגים</span>
              </label>
            </div>
          )}
        </div>
        <div>
          <input className={inputCls} placeholder="קישור חיצוני (אופציונלי)" value={form.externalLink} onChange={e=>setForm({...form, externalLink:e.target.value})} />
          {errors.externalLink && <p className={errorCls}>{errors.externalLink}</p>}
        </div>
        <GuestSelector />
        <button disabled={saving || Object.keys(errors).length > 0} onClick={()=>{}} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? 'שומר…' : 'שמירה'}</button>
      </form>
      )}
      {/* Holidays generator removed per request */}
    </main>
  );
}

type Template = { title: string; description?: string; location?: string; startAt?: string; endAt?: string; holidayKey?: string };

function TemplatesTiles({ onPick }: { onPick: (tpl: Template) => void }) {
  const now = new Date();
  const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const toLocalNow = () => toLocal(now);
  const withTime = (date: Date, timeRef: Date) => { const d = new Date(date); d.setHours(timeRef.getHours(), timeRef.getMinutes(), 0, 0); return d; };
  const nextDOW = (dow: number) => { const d = new Date(now); const diff = (dow - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); return withTime(d, now); };
  const nextFriday = nextDOW(5);
  const nextSaturday = nextDOW(6);
  const nextWeek = (()=>{ const d=new Date(now); d.setDate(d.getDate()+7); return withTime(d, now); })();
  // Use DiceBear shapes as an avatar-like background, overlay a relevant emoji icon
  const bg = (seed: string) => `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc&backgroundType=gradientLinear&radius=50`;
  const random = () => Math.random().toString(36).slice(2,6);
  const categories: { key: 'dinners' | 'holidays' | 'outdoors' | 'other'; label: string }[] = [
    { key: 'dinners', label: 'ארוחות' },
    { key: 'holidays', label: 'חגים' },
    { key: 'outdoors', label: 'טיולים/ים' },
    { key: 'other', label: 'אחר' },
  ];
  const items: { cat: typeof categories[number]['key']; label: string; img: string; tpl: Template }[] = [
    // Holidays ordered starting from Rosh Hashanah
    { cat: 'holidays', label: 'ראש השנה', img: '/templates/rosh-hashanah.jpg', tpl: { title: 'ראש השנה', description: 'ארוחת חג משפחתית', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'יום כיפור', img: '/templates/kippur.jpg', tpl: { title: 'מוצאי יום כיפור', description: 'ארוחת מפסקת/נעילת צום', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'סוכות', img: '/templates/sukkot.jpg', tpl: { title: 'סוכות', description: 'ארוחה בסוכה', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'חנוכה', img: '/templates/hanukkah.jpg', tpl: { title: 'חנוכה', description: 'הדלקת נרות', startAt: toLocal(tonight), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'ט"ו בשבט', img: '/templates/tu-bishvat.jpg', tpl: { title: 'ט"ו בשבט', description: 'סדר פירות', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'פורים', img: '/templates/purim.jpg', tpl: { title: 'פורים', description: 'מסיבת תחפושות', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'פסח', img: '/templates/passover.jpg', tpl: { title: 'פסח', description: 'ליל הסדר משפחתי', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'שבועות', img: '/templates/shavout.jpg', tpl: { title: 'שבועות', description: 'ארוחת חג', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'ט"ו באב', img: '/templates/tu-beav.jpg', tpl: { title: 'ט"ו באב', description: 'מפגש משפחתי', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    { cat: 'holidays', label: 'ל"ג בעומר', img: '/templates/lag-baomer.jpg', tpl: { title: 'ל"ג בעומר', description: 'מדורה משפחתית', startAt: toLocal(nextWeek), holidayKey: 'holiday' } },
    // Meals first in tabs; include lunch
    { cat: 'dinners', label: 'ערב שישי', img: '/templates/shishi-dinner.jpg', tpl: { title: 'ערב שישי', description: 'ארוחת שבת משפחתית', startAt: toLocal(nextFriday), holidayKey: 'shabat_eve' } },
    { cat: 'dinners', label: 'ארוחת צהריים', img: '/templates/dinner.jpg', tpl: { title: 'ארוחת צהריים', description: 'מפגש צהריים', startAt: toLocalNow() } },
    { cat: 'dinners', label: 'ארוחת ערב', img: '/templates/dinner.jpg', tpl: { title: 'ארוחת ערב', description: 'מפגש משפחתי', startAt: toLocalNow() } },
    { cat: 'dinners', label: 'ארוחת בוקר', img: '/templates/brekfast.jpg', tpl: { title: 'ארוחת בוקר', description: 'מפגש בוקר', startAt: toLocalNow() } },
    { cat: 'other', label: 'יום הולדת', img: '/templates/birthday.jpg', tpl: { title: 'מסיבת יום הולדת', description: 'חוגגים יום הולדת', startAt: toLocal(nextWeek) } },
    { cat: 'outdoors', label: 'פיקניק', img: '/templates/picnic.jpg', tpl: { title: 'פיקניק משפחתי', description: 'בפארק', startAt: toLocal(nextWeek) } },
    { cat: 'outdoors', label: 'ים', img: '/templates/beach.jpg', tpl: { title: 'ים', description: 'יום כיף בים', startAt: toLocal(nextWeek) } },
    { cat: 'outdoors', label: 'טיול', img: '/templates/party.jpg', tpl: { title: 'טיול', description: 'טיול משפחתי', startAt: toLocal(nextWeek) } },
    { cat: 'other', label: 'מסעדה', img: '/templates/resturant.jpg', tpl: { title: 'מסעדה', description: 'ארוחה במסעדה', startAt: toLocal(nextWeek) } },
    { cat: 'other', label: 'מותאם אישית', img: '/templates/party.jpg', tpl: { title: '', description: '', startAt: '' } },
  ];

  const [cat, setCat] = useState<'holidays' | 'birthdays' | 'dinners' | 'outdoors' | 'other'>('holidays');

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <button key={c.key} type="button" onClick={()=>setCat(c.key)} className={`px-3 py-1 rounded border text-sm ${cat===c.key?'bg-blue-600 text-white border-blue-600':'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.filter(i=>i.cat===cat).map((t)=> (
          <button type="button" key={t.label} onClick={async()=>{
            // Resolve start time according to rules
            let startISO = t.tpl.startAt || toLocalNow();
            if (t.cat === 'dinners' && /שישי/.test(t.label)) startISO = toLocal(nextFriday);
            if (/שבת/.test(t.label)) startISO = toLocal(nextSaturday);
            if (t.cat === 'holidays') {
              try {
                const year = now.getFullYear();
                const urls = [
                  `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&year=${year}&month=x&i=on&lg=h&d=on&tz=Asia/Jerusalem`,
                  `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&year=${year+1}&month=x&i=on&lg=h&d=on&tz=Asia/Jerusalem`,
                ];
                let nextDate: string | null = null;
                for (const u of urls) {
                  const r = await fetch(u, { cache: 'no-store' });
                  const j = await r.json();
                  const items = (j?.items || []) as any[];
                  const candidates = items.filter(x => typeof x?.title === 'string' && String(x.title).includes(t.label) && typeof x?.date === 'string');
                  for (const c of candidates) {
                    const d = new Date(c.date);
                    if (d >= now) { nextDate = c.date; break; }
                  }
                  if (nextDate) break;
                }
                if (nextDate) {
                  const base = new Date(nextDate);
                  const withNowTime = withTime(base, now);
                  startISO = toLocal(withNowTime);
                }
              } catch {}
            }
            onPick({ ...t.tpl, startAt: startISO, image: t.img });
          }} className="rounded-xl border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-900 hover:shadow flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.img} alt="" className="w-32 h-24 object-cover rounded" />
            <div className="font-medium mt-2 text-sm text-center">{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlacesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  'use client';
  const [input, setInput] = useState(value);
  useEffect(() => { setInput(value); }, [value]);
  useEffect(() => {
    if (!(window as any).google || !(window as any).google.maps?.places) return;
    const el = document.getElementById('places-input') as HTMLInputElement | null;
    if (!el) return;
    const ac = new (window as any).google.maps.places.Autocomplete(el, { fields: ['formatted_address', 'name', 'geometry'] });
    ac.setFields(['formatted_address', 'name', 'geometry']);
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const text = (place?.name && place?.formatted_address) ? `${place.name}, ${place.formatted_address}` : (place?.formatted_address || place?.name || el.value);
      onChange(text || '');
      setInput(text || '');
    });
  }, [onChange]);
  return (
    <input id="places-input" className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="מיקום" value={input} onChange={e=>{ setInput(e.target.value); onChange(e.target.value); }} />
  );
}

// Holidays generator removed per request

// Image input removed per request; image is taken from selected template

function GuestSelector() {
  'use client';
  type GroupNode = { id: string; nickname: string; parentId: string | null; members: { id: string; name: string | null; image: string | null }[] };
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; groupId: string | null } | null>(null);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await fetch('/api/users/me', { cache: 'no-store' });
        const mj = await m.json();
        setMe(mj.user);
        const g = await fetch('/api/family/groups', { cache: 'no-store' });
        const gj = await g.json();
        const nodes: GroupNode[] = (gj.groups || [])
          .map((gr: any) => ({
            id: gr.id,
            nickname: gr.nickname,
            parentId: gr.parent?.id || null,
            members: (gr.members || []).map((u: any) => ({ id: u.id, name: u.name || null, image: u.image || null })),
          }))
          .filter((g: GroupNode) => g.members.length > 0);
        setGroups(nodes);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  // Initialize default selection: select ALL groups and ALL members
  useEffect(() => {
    if (initialized || loading) return;
    if (!groups.length) { setInitialized(true); return; }
    const nextGroups: Record<string, boolean> = {};
    const nextUsers: Record<string, boolean> = {};
    for (const g of groups) {
      nextGroups[g.id] = true;
      for (const u of g.members) nextUsers[u.id] = true;
    }
    setSelectedGroups(nextGroups);
    setSelectedUsers(nextUsers);
    setInitialized(true);
  }, [initialized, loading, groups]);

  function toggleUser(userId: string) {
    setSelectedUsers((s) => ({ ...s, [userId]: !s[userId] }));
  }

  function toggleGroupRecursive(groupId: string) {
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

  useEffect(() => {
    // Serialize selection into hidden input for server
    const input = document.getElementById('guestSelection') as HTMLInputElement | null;
    if (!input) return;
    const ids = Object.entries(selectedUsers).filter(([, v]) => v).map(([k]) => k);
    input.value = JSON.stringify(ids);
  }, [selectedUsers]);

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-300">טוען קבוצות…</div>;
  if (!groups.length) return <div className="text-sm text-gray-600 dark:text-gray-300">אין קבוצות עדיין.</div>;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">מוזמנים</h3>
      <input type="hidden" id="guestSelection" name="guestSelection" />
      <div className="space-y-3">
        {roots.map((root) => (
          <GroupItem key={root.id} node={root} level={0} byParent={byParent} selectedGroups={selectedGroups} onToggleGroup={toggleGroupRecursive} selectedUsers={selectedUsers} onToggleUser={toggleUser} />
        ))}
      </div>
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

function HostSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  'use client';
  const [members, setMembers] = useState<{ id: string; name: string | null }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/users/family', { cache: 'no-store' });
        // We don't have a direct members endpoint; fallback to building from groups list
        const g = await fetch('/api/family/groups', { cache: 'no-store' });
        const gj = await g.json();
        const seen = new Set<string>();
        const list: { id: string; name: string | null }[] = [];
        (gj.groups || []).forEach((gr: any) => {
          (gr.members || []).forEach((u: any) => {
            if (seen.has(u.id)) return;
            seen.add(u.id);
            list.push({ id: u.id, name: u.name || null });
          });
        });
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMembers(list);
      } catch {}
    })();
  }, []);
  return (
    <select className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" value={value} onChange={(e)=>onChange(e.target.value)}>
      {members.map(m => (
        <option key={m.id} value={m.id}>{m.name || m.id.slice(0,6)}</option>
      ))}
    </select>
  );
}

function CoHostsSelector({ selected, onChange, excludeId }: { selected: string[]; onChange: (ids: string[]) => void; excludeId?: string }) {
  'use client';
  const [members, setMembers] = useState<{ id: string; name: string | null }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const g = await fetch('/api/family/groups', { cache: 'no-store' });
        const gj = await g.json();
        const seen = new Set<string>();
        const list: { id: string; name: string | null }[] = [];
        (gj.groups || []).forEach((gr: any) => {
          (gr.members || []).forEach((u: any) => {
            if (seen.has(u.id)) return;
            seen.add(u.id);
            list.push({ id: u.id, name: u.name || null });
          });
        });
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMembers(list);
      } catch {}
    })();
  }, []);
  const toggle = (id: string) => {
    if (id === excludeId) return; // avoid duplicate of host
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">מארחים נוספים (אופציונלי)</div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <label key={m.id} className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-sm ${selected.includes(m.id) ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-700 dark:border-blue-700 dark:text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
            <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} disabled={m.id === excludeId} />
            <span>{m.name || m.id.slice(0,6)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

