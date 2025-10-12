"use client";
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

  // --- Avataaars single-preview controls ---
  const DEFAULT_AVATAAARS_URL = 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=Hoodie&clotheColor=Blue03&eyeType=Happy&eyebrowType=Default&mouthType=Smile&skinColor=Light';

  function pick<T>(values: readonly T[]): T {
    return values[Math.floor(Math.random() * values.length)];
  }

  function generateRandomAvataaarsUrl(): string {
    const topType = pick([
      'NoHair','ShortHairShortFlat','ShortHairTheCaesar','ShortHairFrizzle','ShortHairCurly','LongHairStraight','LongHairCurvy','LongHairFro','Hijab','Hat'] as const);
    const accessoriesType = pick(['Blank','Prescription01','Prescription02','Round','Kurt','Sunglasses'] as const);
    const hairColor = pick(['Auburn','Black','Blonde','BlondeGolden','Brown','BrownDark','PastelPink','Platinum','Red','SilverGray'] as const);
    const facialHairType = pick(['Blank','BeardLight','BeardMedium','MoustacheFancy','MoustacheMagnum'] as const);
    const clotheType = pick(['BlazerShirt','BlazerSweater','Hoodie','Overall','ShirtCrewNeck','ShirtScoopNeck','ShirtVNeck'] as const);
    const clotheColor = pick(['Black','Blue01','Blue02','Blue03','Gray01','Gray02','Heather','PastelBlue','PastelGreen','PastelOrange','PastelRed','PastelYellow','Pink','Red','White'] as const);
    const eyeType = pick(['Default','Happy','Squint','Wink','EyeRoll','Side','Surprised'] as const);
    const eyebrowType = pick(['Default','DefaultNatural','RaisedExcited','RaisedExcitedNatural','SadConcerned','SadConcernedNatural','UpDown','UpDownNatural'] as const);
    const mouthType = pick(['Default','Smile','Serious','Twinkle','Disbelief','Grimace','Eating','Tongue'] as const);
    const skinColor = pick(['Tanned','Yellow','Pale','Light','Brown','DarkBrown','Black'] as const);
    const params = new URLSearchParams({
      avatarStyle: 'Circle',
      topType,
      accessoriesType,
      hairColor,
      facialHairType,
      clotheType,
      clotheColor,
      eyeType,
      eyebrowType,
      mouthType,
      skinColor,
    } as any);
    return `https://avataaars.io/?${params.toString()}`;
  }

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
          <div className="flex gap-2 justify-between">
            <span />
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async ()=>{
              const missing: string[] = [];
              if (!email.trim()) missing.push('אימייל');
              if (!password.trim()) missing.push('סיסמה');
              if (missing.length) { setError(`שדות חסרים: ${missing.join(', ')}`); return; }
              setError('');
              setStep(2);
            }}>הבא</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <input className="w-full border p-2 rounded bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="כינוי" value={nickname} onChange={e=>setNickname(e.target.value)} />
          <div className="space-y-2">
            <div className="text-sm text-gray-600">בחרו אווטאר</div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full">
              <img src={(imageUrl && imageUrl.trim()) || DEFAULT_AVATAAARS_URL} alt="avatar preview" className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border" />
              <div className="flex flex-col gap-2 w-full">
                <div className="w-full">
                  <input
                    className="border rounded p-2 w-full bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="הדביקו כאן קישור Avataaars או קוד SVG"
                    value={imageUrl}
                    onChange={e=>{
                      const raw = e.target.value;
                      const match = (raw.match(/https?:\/\/avataaars\.io\/?\?[^"'<>\s]+/i) || [])[0];
                      setImageUrl(match || raw);
                    }}
                  />
                </div>
                <div className="flex gap-2 flex-wrap w-full">
                  <button type="button" className="px-3 py-2 border rounded" onClick={()=>setImageUrl(generateRandomAvataaarsUrl())}>אקראי</button>
                  <a className="px-3 py-2 border rounded text-blue-700" href="https://getavataaars.com" target="_blank" rel="noreferrer">פתח את Get Avataaars</a>
                  <button type="button" className="px-3 py-2 border rounded" onClick={async()=>{
                    try { const t = await navigator.clipboard.readText(); const match = (t.match(/https?:\/\/avataaars\.io\/?\?[^"'<>\s]+/i) || [])[0]; setImageUrl(match || t || ''); } catch {}
                  }}>הדבק</button>
                  <button type="button" className="px-3 py-2 border rounded" onClick={()=>{ if (imageUrl) navigator.clipboard.writeText(imageUrl).catch(()=>{}); }}>העתק</button>
                  <button type="button" className="px-3 py-2 border rounded" onClick={()=>setImageUrl('')}>נקה</button>
                </div>
                <div className="text-xs text-gray-500">טיפ: אפשר להדביק גם SVG מלא, נחלץ את קישור ה‑Avataaars מתוכו.</div>
              </div>
            </div>
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

