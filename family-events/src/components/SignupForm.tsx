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
          <input className="w-full border p-2 rounded" placeholder="שם תצוגה" value={nickname} onChange={e=>setNickname(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="סיסמה" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="אימייל" value={email} onChange={e=>setEmail(e.target.value)} />
          <div className="flex gap-2 justify-between">
            <span />
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>{
              const missing: string[] = [];
              if (!nickname.trim()) missing.push('שם תצוגה');
              if (!password.trim()) missing.push('סיסמה');
              if (!email.trim()) missing.push('אימייל');
              if (missing.length) { setError(`שדות חסרים: ${missing.join(', ')}`); return; }
              // derive username automatically from nickname if empty
              if (!username.trim()) setUsername(nickname.trim());
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
            {imageUrl && (
              <button type="button" className="px-2 py-1 text-sm border rounded" onClick={()=>setImageUrl('')}>הסרת תמונה</button>
            )}
          </div>
          <div className="pt-2">
            <div className="text-sm text-gray-600 mb-1">או לבחור מכל גלריית DiceBear</div>
            <AvatarPicker onChange={({ url }) => setImageUrl(url)} />
          </div>
          {imageUrl && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <img src={imageUrl} alt="preview" className="w-10 h-10 rounded" />
              <span>תמונה נבחרה</span>
            </div>
          )}
          {uploading && <div className="text-sm text-gray-500">מעלה...</div>}
          <div className="space-y-2">
            <div className="text-sm text-gray-600">בחרו אייקון</div>
            <div className="grid grid-cols-4 gap-3">
              {(['mom','dad','boy','girl'] as const).map((k) => {
                const seed = k === 'boy' ? 'girl' : k === 'girl' ? 'boy' : k;
                const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundType=gradientLinear&backgroundColor=ffdfbf,ffd5dc`;
                return (
                  <label key={k} className={`flex flex-col items-center gap-1 p-2 border rounded cursor-pointer ${icon===k?'ring-2 ring-blue-500':''}`}>
                    <input className="hidden" type="radio" name="icon" value={k} onChange={()=>setIcon(k)} />
                    <img src={url} alt={k} className="w-16 h-16" />
                    <span className="text-xs text-gray-700">{k==='mom'?'אמא':k==='dad'?'אבא':k==='girl'?'ילדה':'ילד'}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-between">
            <button className="px-3 py-2 border rounded" onClick={()=>setStep(1)}>חזרה</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>{ 
              if (!icon) { setError('יש לבחור אייקון (אמא/אבא/ילד/ילדה)'); return; }
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

