"use client";
import { useEffect, useState } from 'react';
import AvatarPicker from '@/components/AvatarPicker';
import { useRouter } from 'next/navigation';

export default function SignupForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code] = useState(initialCode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [icon, setIcon] = useState<'mom' | 'dad' | 'custom' | ''>('');
  const [customSeed, setCustomSeed] = useState<string>('custom');
  const [groupId, setGroupId] = useState<string>('');
  const [newGroup, setNewGroup] = useState('');
  const [groups, setGroups] = useState<{ id: string; nickname: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load() {
      // Groups endpoint requires auth; before login this will likely be empty
      // This will gracefully force "create new group" flow.
      const first = await fetch('/api/signup/first');
      if (first.ok) {
        const j = await first.json();
        setIsFirst(j.isFirst);
      }
    }
    load();
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, username, password, nickname, icon, groupId: groupId || null, email, imageUrl: imageUrl || null, newGroup: newGroup || null, familyName: isFirst ? familyName : undefined }) });
      if (res.ok) {
        router.push('/signin');
      } else {
        const j = await res.json().catch(()=>({}));
        setError(j.error || 'אירעה שגיאה בהרשמה');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-page max-w-md mx-auto space-y-4 px-3">
      <h1 className="text-2xl font-bold">הרשמה</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {step === 1 && (
        <div className="space-y-3">
          {isFirst && (
            <input className="w-full border p-2 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400" placeholder="שם משפחה ראשי" value={familyName} onChange={e=>setFamilyName(e.target.value)} />
          )}
          <input className="w-full border p-2 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400" placeholder="שם משתמש" value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="w-full border p-2 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400" placeholder="סיסמה" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <input className="w-full border p-2 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400" placeholder="אימייל" value={email} onChange={e=>setEmail(e.target.value)} />
          <div className="flex gap-2 justify-between">
            <span />
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async ()=>{
              const missing: string[] = [];
              if (!username.trim()) missing.push('שם משתמש');
              if (!password.trim()) missing.push('סיסמה');
              if (!email.trim()) missing.push('אימייל');
              if (missing.length) { setError(`שדות חסרים: ${missing.join(', ')}`); return; }
              // Check username availability before proceeding
              try {
                const res = await fetch(`/api/users/check-username?u=${encodeURIComponent(username.trim())}`);
                const j = await res.json();
                if (!j.available) { setError('שם המשתמש כבר תפוס'); return; }
              } catch {
                setError('תקלה בבדיקת שם המשתמש'); return;
              }
              setError('');
              setStep(2);
            }}>הבא</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <input className="w-full border p-2 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400" placeholder="כינוי (לא חובה)" value={nickname} onChange={e=>setNickname(e.target.value)} />
          <div className="space-y-2">
            <div className="text-sm text-gray-600">בחרו אייקון (חובה)</div>
            <div className="grid grid-cols-3 gap-3">
              {([ 
                { key: 'mom', label: 'אישה', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Maria' },
                { key: 'dad', label: 'גבר', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=la86p9t0' },
                { key: 'custom', label: 'מותאם', url: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(customSeed)}` },
              ] as const).map((opt) => (
                <label key={opt.key} className={`flex flex-col items-center gap-1 p-2 border rounded cursor-pointer ${icon===opt.key?'ring-2 ring-blue-500':''}`}>
                  <input className="hidden" type="radio" name="icon" value={opt.key} onChange={()=>{ setIcon(opt.key); setImageUrl(opt.url); }} />
                  <img src={opt.url} alt={opt.label} className="w-16 h-16" />
                  <span className="text-xs text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className="px-3 py-2 border rounded" onClick={()=>{
                const rnd = Math.random().toString(36).slice(2,10);
                setCustomSeed(rnd);
                setIcon('custom');
                const u = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(rnd)}`;
                setImageUrl(u);
              }}>אקראי</button>
              <input className="border rounded p-2 flex-1 min-w-[160px]" placeholder="מפתח מותאם" value={customSeed} onChange={e=>{ const v = e.target.value; setCustomSeed(v); setIcon('custom'); const u = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(v)}`; setImageUrl(u); }} />
              <a className="text-sm text-blue-600 underline" href="https://www.dicebear.com/styles/adventurer" target="_blank" rel="noreferrer">עיון בגלריה</a>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-sm text-gray-600 mb-1">או לבחור מכל גלריית DiceBear</div>
            <AvatarPicker onSelect={(url)=>setImageUrl(url)} />
          </div>
          <div className="flex gap-2 justify-between">
            <button className="px-3 py-2 border rounded" onClick={()=>setStep(1)}>חזרה</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>{ 
              if (!icon) { setError('יש לבחור אייקון'); return; }
              setError('');
              setStep(3); 
            }}>הבא</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <form onSubmit={submit} className="space-y-3">
          {groups.length > 0 ? (
            <>
              <select className="w-full border p-2 rounded text-gray-900 dark:text-gray-100" value={groupId} onChange={e=>setGroupId(e.target.value)}>
                <option value="">— לבחור קבוצה —</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.nickname}</option>
                ))}
              </select>
              <div className="text-sm text-gray-500">או צרו קבוצה חדשה:</div>
              <input className="w-full border p-2 rounded" placeholder="שם קבוצה" value={newGroup} onChange={e=>setNewGroup(e.target.value)} />
            </>
          ) : (
            <>
              <div className="text-sm text-gray-500">אין קבוצות קיימות. צרו קבוצה חדשה:</div>
              <input className="w-full border p-2 rounded" placeholder="שם קבוצה" value={newGroup} onChange={e=>setNewGroup(e.target.value)} />
            </>
          )}
          <div className="flex gap-2 justify-between">
            <button type="button" className="px-3 py-2 border rounded" onClick={()=>setStep(2)}>חזרה</button>
            <button disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded">{loading?'שולח…':'סיום הרשמה'}</button>
          </div>
        </form>
      )}
    </main>
  );
}

