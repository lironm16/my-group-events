"use client";
import { useMemo, useState } from 'react';

const STYLES = [
  'adventurer', 'adventurer-neutral', 'big-ears', 'big-ears-neutral',
  'big-smile', 'bottts', 'croodles', 'croodles-neutral', 'identicon',
  'initials', 'lorelei', 'micah', 'miniavs', 'open-peeps', 'personas',
  'pixel-art', 'pixel-art-neutral', 'shapes', 'thumbs'
] as const;

type Style = typeof STYLES[number];

function buildUrl(style: Style, seed: string, bg = 'ffdfbf,ffd5dc') {
  const base = `https://api.dicebear.com/7.x/${style}/svg`;
  const params = new URLSearchParams({ seed, radius: '50', backgroundType: 'gradientLinear', backgroundColor: bg });
  return `${base}?${params.toString()}`;
}

export default function AvatarPicker({
  value,
  onChange,
}: {
  value?: { style: Style; seed: string };
  onChange: (v: { style: Style; seed: string; url: string }) => void;
}) {
  const [style, setStyle] = useState<Style>(value?.style ?? 'adventurer');
  const [seed, setSeed] = useState<string>(value?.seed ?? 'family');
  const url = useMemo(() => buildUrl(style, seed), [style, seed]);

  function randomize() {
    const rnd = Math.random().toString(36).slice(2, 10);
    setSeed(rnd);
    // Immediately emit selection so it feels responsive
    const nextUrl = buildUrl(style, rnd);
    onChange({ style, seed: rnd, url: nextUrl });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select className="border rounded p-2" value={style} onChange={(e)=>setStyle(e.target.value as Style)}>
          {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="border rounded p-2 flex-1" value={seed} onChange={(e)=>setSeed(e.target.value)} placeholder="Seed" />
        <button type="button" className="px-3 py-2 border rounded" onClick={randomize}>אקראי</button>
        <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={()=>onChange({ style, seed, url })}>בחרו אווטאר</button>
      </div>
      <div className="flex items-center gap-3">
        <img src={url} alt="preview" className="w-20 h-20" />
        <div className="text-xs text-gray-500 break-all">{url}</div>
      </div>
    </div>
  );
}

