"use client";
import { useMemo, useState, useEffect } from 'react';
import DateTimePicker from '@/components/DateTimePicker';

export default function NewEventPage() {
  const [form, setForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<'weekend' | 'holiday' | 'other' | 'custom' | null>(null);
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

  return (
    <main className="container-page space-y-4">
      <h1 className="text-2xl font-bold">אירוע חדש</h1>
      {step === 1 && (
        <CategoryTiles onPick={(cat)=>{
          setCategory(cat);
          if (cat === 'custom') {
            setForm({ title: '', description: '', location: '', startAt: '', endAt: '', externalLink: '' });
            (window as any).__holidayKey = null;
            setStep(3);
          } else {
            setStep(2);
          }
        }} />
      )}
      {step === 2 && (
        <TemplatesTiles category={category} onBack={()=>setStep(1)} onPick={(tpl)=>{
          setForm({
            title: tpl.title,
            description: tpl.description ?? '',
            location: tpl.location ?? '',
            startAt: tpl.startAt ?? '',
            endAt: tpl.endAt ?? '',
            externalLink: ''
          });
          (window as any).__holidayKey = tpl.holidayKey ?? null;
          setStep(3);
        }} />
      )}
      {step === 3 && (
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          <input className={inputCls} placeholder="כותרת" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          {errors.title && <p className={errorCls}>{errors.title}</p>}
        </div>
        <input className={inputCls} placeholder="תיאור" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <input className={inputCls} placeholder="מיקום" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
        <div>
          <DateTimePicker label="תאריך התחלה" value={form.startAt} onChange={(v)=>setForm({...form, startAt:v})} allowDateOnly />
          {errors.startAt && <p className={errorCls}>{errors.startAt}</p>}
        </div>
        <div>
          <DateTimePicker label="תאריך סיום" value={form.endAt} onChange={(v)=>setForm({...form, endAt:v})} allowDateOnly />
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
        <ShareWhatsAppToggle title={form.title} />
        <button disabled={saving || Object.keys(errors).length > 0} onClick={()=>{}} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? 'שומר…' : 'שמירה'}</button>
      </form>
      )}
      <section className="space-y-2 max-w-xl">
        <h2 className="font-semibold">יצירת חגים (ישראל)</h2>
        <GenerateHolidays />
      </section>
    </main>
  );
}

type Template = { title: string; description?: string; location?: string; startAt?: string; endAt?: string; holidayKey?: string };

function CategoryTiles({ onPick }: { onPick: (c: 'weekend' | 'holiday' | 'other' | 'custom') => void }) {
  const items = [
    { key: 'weekend', label: 'סופ"ש' },
    { key: 'holiday', label: 'חג' },
    { key: 'other', label: 'אחר' },
    { key: 'custom', label: 'מותאם אישית' },
  ] as const;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
      {items.map(it => (
        <button type="button" key={it.key} onClick={()=>onPick(it.key)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 hover:shadow flex items-center justify-center font-medium">
          {it.label}
        </button>
      ))}
    </div>
  );
}

function TemplatesTiles({ category, onPick, onBack }: { category: 'weekend' | 'holiday' | 'other' | null; onPick: (tpl: Template) => void; onBack: () => void }) {
  const now = new Date();
  const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const nextFriday = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7; // next Friday
    d.setDate(d.getDate() + diff);
    d.setHours(19,0,0,0);
    return d;
  })();
  const nextSaturday = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7; // next Saturday
    d.setDate(d.getDate() + diff);
    d.setHours(12,0,0,0);
    return d;
  })();
  const tonight = (()=>{ const d=new Date(now); d.setHours(19,0,0,0); return d; })();
  const nextWeek = (()=>{ const d=new Date(now); d.setDate(d.getDate()+7); d.setHours(12,0,0,0); return d; })();
  // Weekend templates
  const weekendTpls = [
    { label: 'ערב שישי', bgUrl: '/templates/rosh-hashanah.jpg', tpl: { title: 'ערב שישי', description: 'ארוחת שבת משפחתית', startAt: toLocal(nextFriday), holidayKey: 'shabat_eve' } },
    { label: 'שבת', bgUrl: '/templates/rosh-hashanah.jpg', tpl: { title: 'שבת', description: 'מפגש שבת', startAt: toLocal(nextSaturday), holidayKey: 'shabat' } },
  ];

  // Holiday-specific templates using uploaded images under public/templates
  const holidayImages: { key: string; label: string; file: string }[] = [
    { key: 'rosh_hashanah', label: 'ראש השנה', file: '/templates/rosh-hashanah.jpg' },
    { key: 'kippur', label: 'יום כיפור', file: '/templates/kippur.jpg' },
    { key: 'sukkot', label: 'סוכות', file: '/templates/sukkot.jpg' },
    { key: 'hanukkah', label: 'חנוכה', file: '/templates/hanukkah.jpg' },
    { key: 'passover', label: 'פסח', file: '/templates/passover.jpg' },
    { key: 'shavuot', label: 'שבועות', file: '/templates/shavout.jpg' },
  ];

  const holidayTpls = holidayImages.map(h => ({
    label: h.label,
    bgUrl: h.file,
    tpl: { title: h.label, description: 'מפגש חג', startAt: toLocal(nextWeek), holidayKey: h.key },
  }));

  // Other templates
  const otherTpls = [
    { label: 'יום הולדת', bgUrl: '/templates/rosh-hashanah.jpg', tpl: { title: 'יום הולדת', description: 'חגיגת יום הולדת משפחתית', startAt: toLocal(nextWeek), holidayKey: 'birthday' } },
    { label: 'פיקניק', bgUrl: '/templates/rosh-hashanah.jpg', tpl: { title: 'פיקניק', description: 'פיקניק משפחתי בפארק', startAt: toLocal(nextWeek), holidayKey: 'picnic' } },
    { label: 'חופשת הקיץ', bgUrl: '/templates/rosh-hashanah.jpg', tpl: { title: 'חופשת הקיץ', description: 'עדכון/מפגש', startAt: toLocal(nextWeek), holidayKey: 'summer_break' } },
    { label: 'ים', bgUrl: '/templates/rosh-hashanah.jpg', tpl: { title: 'ים', description: 'מפגש חוף/ים', startAt: toLocal(nextWeek), holidayKey: 'beach' } },
    { label: 'על האש (BBQ)', bgUrl: '/templates/rosh-hashanah.jpg', tpl: { title: 'על האש', description: 'על האש משפחתי', startAt: toLocal(nextWeek), holidayKey: 'bbq' } },
  ];

  let tpls: { label: string; bgUrl: string; tpl: Template }[] = [];
  if (category === 'weekend') tpls = weekendTpls;
  else if (category === 'holiday') tpls = holidayTpls;
  else if (category === 'other') tpls = otherTpls;

  return (
    <div className="space-y-3">
      <button type="button" className="px-3 py-2 border rounded" onClick={onBack}>חזרה</button>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
        {tpls.map((t)=> (
          <button type="button" key={t.label} onClick={()=>onPick(t.tpl)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 hover:shadow flex flex-col items-center">
            <div className="relative w-32 h-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.bgUrl} alt="" className="absolute inset-0 w-full h-full rounded-xl object-cover" />
            </div>
            <div className="font-medium mt-3 text-sm md:text-base">{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GenerateHolidays() {
  'use client';
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>('');
  async function run() {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/events/generate-holidays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error || 'שגיאה'); return; }
      setMsg(`נוצרו ${j.created} אירועים לשנת ${j.year}`);
    } catch { setMsg('שגיאה'); }
    finally { setSaving(false); }
  }
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={year} onChange={e=>setYear(Number(e.target.value)||new Date().getFullYear())} className="w-32 border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700" />
      <button disabled={saving} onClick={run} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">{saving?'מייצר…':'יצירת חגים'}</button>
      {msg && <span className="text-sm text-gray-600 dark:text-gray-300">{msg}</span>}
    </div>
  );
}

function GuestSelector() {
  'use client';
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; groupId: string | null } | null>(null);
  const [groups, setGroups] = useState<{ id: string; nickname: string; members: { id: string; name: string | null; image: string | null; username: string | null }[] }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const m = await fetch('/api/users/me');
        const mj = await m.json();
        setMe(mj.user);
        const g = await fetch('/api/family/groups');
        const gj = await g.json();
        setGroups(gj.groups || []);
        // Default: select everyone (placeholder; apply opt-outs here later)
        const sel: Record<string, boolean> = {};
        (gj.groups || []).forEach((gr: any) => gr.members.forEach((u: any) => { sel[u.id] = true; }));
        setSelected(sel);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleUser(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }
  function toggleGroup(id: string, members: { id: string }[]) {
    setSelectedGroups((g) => ({ ...g, [id]: !g[id] }));
    const on = !selectedGroups[id];
    setSelected((s) => {
      const ns = { ...s };
      members.forEach((m) => { ns[m.id] = on; });
      return ns;
    });
  }

  useEffect(() => {
    // Serialize selection into hidden input for server
    const input = document.getElementById('guestSelection') as HTMLInputElement | null;
    if (!input) return;
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    input.value = JSON.stringify(ids);
  }, [selected]);

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-300">טוען קבוצות…</div>;
  if (!groups.length) return <div className="text-sm text-gray-600 dark:text-gray-300">אין קבוצות עדיין.</div>;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">מוזמנים</h3>
      <input type="hidden" id="guestSelection" name="guestSelection" />
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="rounded border border-gray-200 dark:border-gray-800 p-3">
            <label className="inline-flex items-center gap-2 mb-2">
              <input type="checkbox" checked={!!selectedGroups[g.id]} onChange={() => toggleGroup(g.id, g.members)} />
              <span className="font-medium">{g.nickname}</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.members.map((u) => (
                <label key={u.id} className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-sm ${selected[u.id] ? 'bg-blue-50 border-blue-300' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.image && u.image.startsWith('http') ? u.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(u.username || u.name || 'user')}`} alt={u.name || u.username || ''} className="w-5 h-5" />
                  <span>{u.name || u.username}</span>
                  <input type="checkbox" className="ml-1" checked={!!selected[u.id]} onChange={() => toggleUser(u.id)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareWhatsAppToggle({ title }: { title: string }) {
  'use client';
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const input = document.getElementById('shareWhatsApp') as HTMLInputElement | null;
    if (input) input.value = enabled ? '1' : '0';
  }, [enabled]);
  return (
    <div className="mt-3 flex items-center gap-2">
      <input type="hidden" id="shareWhatsApp" name="shareWhatsApp" defaultValue="1" />
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} />
        <span>שלח קישור בוואטסאפ אחרי יצירה</span>
      </label>
    </div>
  );
}

