"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [icon, setIcon] = useState<'mom' | 'dad' | 'boy' | 'girl' | ''>('');
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
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">הרשמה</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {step === 1 && (
        <div className="space-y-3">
          {isFirst && (
            <input className="w-full border p-2 rounded" placeholder="שם משפחה ראשי" value={familyName} onChange={e=>setFamilyName(e.target.value)} />
          )}
          <input className="w-full border p-2 rounded" placeholder="שם משתמש" value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="אימייל" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="סיסמה" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <div className="flex gap-2 justify-between">
            <span />
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>{
              const missing: string[] = [];
              if (!username.trim()) missing.push('שם משתמש');
              if (!email.trim()) missing.push('אימייל');
              if (!password.trim()) missing.push('סיסמה');
              if (!code) missing.push('קוד הזמנה');
              if (missing.length) { setError(`שדות חסרים: ${missing.join(', ')}`); return; }
              setError('');
              setStep(2);
            }}>הבא</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <input className="w-full border p-2 rounded" placeholder="שם תצוגה (לא חובה)" value={nickname} onChange={e=>setNickname(e.target.value)} />
          <div className="flex items-center gap-2">
            <input className="w-full border p-2 rounded" placeholder="קישור לתמונה (לא חובה)" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
            <label className="px-3 py-2 border rounded cursor-pointer">
              העלאה
              <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                const form = new FormData();
                form.append('file', f);
                const res = await fetch('/api/upload', { method: 'POST', body: form });
                const j = await res.json();
                setUploading(false);
                if (j.url) setImageUrl(j.url);
              }} />
            </label>
          </div>
          {uploading && <div className="text-sm text-gray-500">מעלה...</div>}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">אייקון:</span>
            {(['mom','dad','boy','girl'] as const).map(i => (
              <label key={i} className={`px-2 py-1 border rounded cursor-pointer ${icon===i?'bg-blue-100':''}`}>
                <input className="hidden" type="radio" name="icon" value={i} onChange={()=>setIcon(i)} />
                {i === 'mom' ? '👩' : i === 'dad' ? '👨' : i === 'boy' ? '👦' : '👧'}
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-between">
            <button className="px-3 py-2 border rounded" onClick={()=>setStep(1)}>חזרה</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>{ setStep(3); }}>הבא</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <form onSubmit={submit} className="space-y-3">
          {groups.length > 0 ? (
            <>
              <select className="w-full border p-2 rounded" value={groupId} onChange={e=>setGroupId(e.target.value)}>
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

