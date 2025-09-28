"use client";
import { useState } from 'react';

export default function CopyTools({ numbers, message }: { numbers: string[]; message: string }) {
  const [copied, setCopied] = useState<'numbers' | 'message' | null>(null);

  async function copy(text: string, what: 'numbers' | 'message') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  const joined = numbers.join(', ');

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => copy(message, 'message')}>
        העתק הודעת תזכורת {copied === 'message' ? '✓' : ''}
      </button>
      <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => copy(joined, 'numbers')}>
        העתק מספרים ({numbers.length}) {copied === 'numbers' ? '✓' : ''}
      </button>
    </div>
  );
}

