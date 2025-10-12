"use client";
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AvataaarsEditor, { generateRandomAvataaarsUrl } from '@/components/AvataaarsEditor';

export default function SignupForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [newGroup, setNewGroup] = useState('');
  const [groups, setGroups] = useState<{ id: string; nickname: string; members?: { id: string; name: string | null; image: string | null }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string>('');

  // Avatar generation imported from AvataaarsEditor

  useEffect(() => {
    async function load() {
      const first = await fetch('/api/signup/first');
      if (first.ok) {
        const j = await first.json();
        setIsFirst(j.isFirst);
      }
      if (code) {
        const res = await fetch(`/api/family/groups?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const j = await res.json();
          setGroups(j.groups || []);
        }
      }
    }
    load();
  }, [code]);

  async function submit(e: React.FormEvent, overrideImageUrl?: string) {
    e.preventDefault();
    setLoading(true);
    try {
      const finalImageUrl = (overrideImageUrl ?? imageUrl) || null;
      const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, password, nickname, groupId: groupId || null, email, imageUrl: finalImageUrl, newGroup: newGroup || null, familyName: isFirst ? familyName : undefined }) });
      if (res.ok) {
        // Try automatic login, then redirect to events
        const login = await signIn('credentials', { email: email.trim(), password, redirect: false });
        if (login?.ok) {
          router.replace('/events');
        } else {
          router.push('/signin');
        }
      } else {
        const j = await res.json().catch(()=>({}));
        setError(j.error || 'אירעה שגיאה בהרשמה');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-page max-w-md mx-auto space-y-4 px-3 overflow-x-hidden">
      <h1 className="text-2xl font-bold">הרשמה</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {step === 1 && (
        <div className="space-y-3">
          {isFirst && (
            <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="שם משפחה ראשי" value={familyName} onChange={e=>setFamilyName(e.target.value)} />
          )}
          <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="אימייל" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="סיסמה" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <div className="space-y-2">
            <div className="flex gap-2 justify-between">
              <span />
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async ()=>{
                const missing: string[] = [];
                const emailTrim = email.trim().toLowerCase();
                if (!emailTrim) missing.push('אימייל');
                if (!password.trim()) missing.push('סיסמה');
                if (missing.length) { setError(`שדות חסרים: ${missing.join(', ')}`); return; }
                // early email availability check
                try {
                  const res = await fetch(`/api/users/check-email?email=${encodeURIComponent(emailTrim)}`);
                  if (res.ok) {
                    const j = await res.json();
                    if (!j.available) { setError('האימייל כבר בשימוש'); return; }
                  }
                } catch {}
                setError('');
                setStep(2);
              }}>הבא</button>
            </div>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="כינוי" value={nickname} onChange={e=>setNickname(e.target.value)} />
          <div className="space-y-2">
            <div className="text-sm text-gray-600">בחרו אווטאר</div>
            <AvataaarsEditor value={imageUrl} onChange={setImageUrl} showExternalLink />
          </div>
          <div className="flex gap-2 justify-between">
            <button className="px-3 py-2 border rounded" onClick={()=>setStep(1)}>חזרה</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async()=>{ 
              if (!nickname.trim()) { setError('יש להזין כינוי'); return; }
              if (!(imageUrl && imageUrl.trim())) { 
                const auto = generateRandomAvataaarsUrl();
                setImageUrl(auto);
                setError('');
                if (!code) {
                  const fakeEvent = { preventDefault: () => {} } as any;
                  await submit(fakeEvent, auto);
                  return;
                }
                setStep(3);
                return;
              }
              setError('');
              // If no invite code provided, finish signup here (pending approval flow)
              if (!code) {
                const fakeEvent = { preventDefault: () => {} } as any;
                await submit(fakeEvent, imageUrl);
                return;
              }
              setStep(3); 
            }}>הבא</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <form onSubmit={submit} className="space-y-3">
          {groups.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                {groups.map(g => (
                  <label key={g.id} className={`border rounded p-3 cursor-pointer flex flex-col gap-2 ${groupId===g.id?'ring-2 ring-blue-500 bg-white dark:bg-gray-100 text-gray-900':'bg-white dark:bg-gray-900'} border-gray-200 dark:border-gray-800`}>
                    <input type="radio" className="hidden" name="group" value={g.id} onChange={()=>setGroupId(g.id)} />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{g.nickname}</span>
                    </div>
                    {g.members && g.members.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pl-11">
                        {g.members.map(m => (
                          <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                            <img src={m.image && m.image.startsWith('http') ? m.image : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(m.name || 'user')}`} alt={m.name || ''} className="w-4 h-4" />
                            <span>{m.name || ''}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 pl-11">אין חברים עדיין</div>
                    )}
                  </label>
                ))}
              </div>
              <div className="text-sm text-gray-500 pt-2">או צרו קבוצה חדשה:</div>
              <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="שם קבוצה (ייחודי)" value={newGroup} onChange={e=>{ setNewGroup(e.target.value); setGroupId(''); }} />
            </>
          ) : (
            <>
              <div className="text-sm text-gray-500">אין קבוצות קיימות. צרו קבוצה חדשה:</div>
              <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="שם קבוצה (ייחודי)" value={newGroup} onChange={e=>setNewGroup(e.target.value)} />
            </>
          )}
          <div className="flex gap-2 justify-between">
            <button type="button" className="px-3 py-2 border rounded" onClick={()=>setStep(2)}>חזרה</button>
            <button disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded" onClick={(e)=>{
              if (!groupId && !newGroup.trim()) { e.preventDefault(); setError('חובה לבחור קבוצה קיימת או ליצור קבוצה חדשה'); return; }
              if (!groupId && newGroup.trim() && groups.some(g => g.nickname.trim() === newGroup.trim())) { e.preventDefault(); setError('שם הקבוצה כבר קיים'); return; }
            }}>{loading?'שולח…':'סיום הרשמה'}</button>
          </div>
        </form>
      )}
    </main>
  );
}

