"use client";
import { useEffect, useMemo, useState } from "react";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (url: string) => void;
  name?: string; // optional form field name (renders hidden input)
  className?: string;
};

const DEFAULT_AVATAAARS_URL =
  "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=Hoodie&clotheColor=Blue03&eyeType=Happy&eyebrowType=Default&mouthType=Smile&skinColor=Light";

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

export function generateRandomAvataaarsUrl(): string {
  const topType = pick([
    "NoHair",
    "ShortHairShortFlat",
    "ShortHairTheCaesar",
    "ShortHairFrizzle",
    "ShortHairCurly",
    "LongHairStraight",
    "LongHairCurvy",
    "LongHairFro",
    "Hijab",
    "Hat",
  ] as const);
  const accessoriesType = pick([
    "Blank",
    "Prescription01",
    "Prescription02",
    "Round",
    "Kurt",
    "Sunglasses",
  ] as const);
  const hairColor = pick([
    "Auburn",
    "Black",
    "Blonde",
    "BlondeGolden",
    "Brown",
    "BrownDark",
    "PastelPink",
    "Platinum",
    "Red",
    "SilverGray",
  ] as const);
  const facialHairType = pick([
    "Blank",
    "BeardLight",
    "BeardMedium",
    "MoustacheFancy",
    "MoustacheMagnum",
  ] as const);
  const clotheType = pick([
    "BlazerShirt",
    "BlazerSweater",
    "Hoodie",
    "Overall",
    "ShirtCrewNeck",
    "ShirtScoopNeck",
    "ShirtVNeck",
  ] as const);
  const clotheColor = pick([
    "Black",
    "Blue01",
    "Blue02",
    "Blue03",
    "Gray01",
    "Gray02",
    "Heather",
    "PastelBlue",
    "PastelGreen",
    "PastelOrange",
    "PastelRed",
    "PastelYellow",
    "Pink",
    "Red",
    "White",
  ] as const);
  const eyeType = pick([
    "Default",
    "Happy",
    "Squint",
    "Wink",
    "EyeRoll",
    "Side",
    "Surprised",
  ] as const);
  const eyebrowType = pick([
    "Default",
    "DefaultNatural",
    "RaisedExcited",
    "RaisedExcitedNatural",
    "SadConcerned",
    "SadConcernedNatural",
    "UpDown",
    "UpDownNatural",
  ] as const);
  const mouthType = pick([
    "Default",
    "Smile",
    "Serious",
    "Twinkle",
    "Disbelief",
    "Grimace",
    "Eating",
    "Tongue",
  ] as const);
  const skinColor = pick([
    "Tanned",
    "Yellow",
    "Pale",
    "Light",
    "Brown",
    "DarkBrown",
    "Black",
  ] as const);
  const params = new URLSearchParams({
    avatarStyle: "Circle",
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

export default function AvataaarsEditor({ value, defaultValue, onChange, name, className }: Props) {
  const isControlled = typeof value === "string";
  const [internal, setInternal] = useState<string>(defaultValue ?? "");

  const current = isControlled ? (value as string) : internal;

  useEffect(() => {
    if (isControlled) return;
    setInternal(defaultValue ?? "");
  }, [defaultValue, isControlled]);

  function setUrl(next: string) {
    if (onChange) onChange(next);
    if (!isControlled) setInternal(next);
  }

  function handleChange(raw: string) {
    const match = (raw.match(/https?:\/\/avataaars\.io\/?\?[^"'<>\s]+/i) || [])[0];
    setUrl(match || raw);
  }

  return (
    <div className={"space-y-2 " + (className || "") }>
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={(current && current.trim()) || DEFAULT_AVATAAARS_URL}
          alt="avatar preview"
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border"
        />
        <div className="flex flex-col gap-2 w-full">
          <div className="w-full">
            <input
              className="border rounded p-2 w-full bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="הדביקו כאן קישור Avataaars או קוד SVG"
              value={current}
              onChange={(e) => handleChange(e.target.value)}
            />
            {name ? <input type="hidden" name={name} value={current} /> : null}
          </div>
          <div className="flex gap-2 flex-wrap w-full">
            <button type="button" className="px-3 py-2 border rounded" onClick={() => setUrl(generateRandomAvataaarsUrl())}>אקראי</button>
            <a className="px-3 py-2 border rounded text-blue-700" href="https://getavataaars.com" target="_blank" rel="noreferrer">פתח את Get Avataaars</a>
            <button
              type="button"
              className="px-3 py-2 border rounded"
              onClick={async () => {
                try {
                  const t = await navigator.clipboard.readText();
                  const match = (t.match(/https?:\/\/avataaars\.io\/?\?[^"'<>\s]+/i) || [])[0];
                  setUrl(match || t || "");
                } catch {}
              }}
            >הדבק</button>
            <button
              type="button"
              className="px-3 py-2 border rounded"
              onClick={() => {
                if (current) navigator.clipboard.writeText(current).catch(() => {});
              }}
            >העתק</button>
            <button type="button" className="px-3 py-2 border rounded" onClick={() => setUrl("")}>נקה</button>
          </div>
          <div className="text-xs text-gray-500">טיפ: אפשר להדביק גם SVG מלא, נחלץ את קישור ה‑Avataaars מתוכו.</div>
        </div>
      </div>
    </div>
  );
}
