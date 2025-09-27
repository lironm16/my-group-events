"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Nav() {
  const [signedIn, setSignedIn] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/auth/session');
      setSignedIn(res.ok);
    })();
  }, []);

  return (
    <nav className="w-full flex items-center justify-between p-4 bg-white border-b">
      <div className="flex gap-4">
        <Link href="/" className="font-semibold">בית</Link>
        <Link href="/events">אירועים</Link>
      </div>
      <div>
        {!signedIn ? (
          <Link href="/api/auth/signin" className="px-3 py-1 bg-blue-600 text-white rounded">התחברות</Link>
        ) : (
          <Link href="/api/auth/signout" className="px-3 py-1 bg-gray-200 rounded">התנתקות</Link>
        )}
      </div>
    </nav>
  );
}

