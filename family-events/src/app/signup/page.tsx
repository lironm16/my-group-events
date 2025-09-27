"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [code, setCode] = useState(sp.get('code') ?? '');
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

  useEffect(() => {
    async function load() {
      if (!code) return;
      const res = await fetch('/api/family/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
      }
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
        alert(j.error || 'שגיאה בהרשמה');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-page max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">הרשמה</h1>
      <form onSubmit={submit} className="space-y-3">
        {isFirst && (
          <input className="w-full border p-2 rounded" placeholder="שם משפחה ראשי" value={familyName} onChange={e=>setFamilyName(e.target.value)} />
        )}
        <input className="w-full border p-2 rounded" placeholder="קוד הזמנה" value={code} onChange={e=>setCode(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="כינוי/שם משתמש" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="אימייל" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="סיסמה" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="שם תצוגה" value={nickname} onChange={e=>setNickname(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="קישור לתמונה (לא חובה)" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600">אייקון:</span>
          {(['mom','dad','boy','girl'] as const).map(i => (
            <label key={i} className={`px-2 py-1 border rounded cursor-pointer ${icon===i?'bg-blue-100':''}`}>
              <input className="hidden" type="radio" name="icon" value={i} onChange={()=>setIcon(i)} />
              {i === 'mom' ? '👩' : i === 'dad' ? '👨' : i === 'boy' ? '👦' : '👧'}
            </label>
          ))}
        </div>
        <select className="w-full border p-2 rounded" value={groupId} onChange={e=>setGroupId(e.target.value)}>
          <option value="">— לבחור קבוצה (אופציונלי) —</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.nickname}</option>
          ))}
        </select>
        <input className="w-full border p-2 rounded" placeholder="או צרו קבוצה חדשה (שם)" value={newGroup} onChange={e=>setNewGroup(e.target.value)} />
        <button disabled={loading} className="w-full px-3 py-2 bg-blue-600 text-white rounded">{loading?'שולח…':'הרשמה'}</button>
      </form>
    </main>
  );
}

