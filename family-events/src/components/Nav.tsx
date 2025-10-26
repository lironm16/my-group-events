"use client";
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import { useSession, signOut } from 'next-auth/react';
import FamilyMenu from '@/components/FamilyMenu';
import { useEffect, useRef, useState } from 'react';

export default function Nav() {
  const { data: session, status } = useSession();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side: Menu button */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="px-2 py-1 rounded border text-sm dark:border-gray-700"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ☰ תפריט
          </button>
          {menuOpen && (
            <div className="absolute mt-2 right-0 min-w-[180px] rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
              <ul className="text-sm">
                <li>
                  <Link className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" href={status === 'authenticated' ? '/events' : '/'} onClick={() => setMenuOpen(false)}>בית</Link>
                </li>
                <li>
                  <Link className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" href="/family" onClick={() => setMenuOpen(false)}>קבוצות</Link>
                </li>
                {status === 'authenticated' && (
                  <li>
                    <Link className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-green-700 dark:text-green-400" href="/events/new" onClick={() => setMenuOpen(false)}>יצירת אירוע</Link>
                  </li>
                )}
                {status === 'authenticated' && (
                  <li>
                    <Link className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" href="/settings" onClick={() => setMenuOpen(false)}>הגדרות</Link>
                  </li>
                )}
                <li className="border-t border-gray-200 dark:border-gray-800" />
                {status !== 'authenticated' ? (
                  <li>
                    <Link className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" href="/signin" onClick={() => setMenuOpen(false)}>התחברות</Link>
                  </li>
                ) : (
                  <li>
                    <button className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }); }}>התנתקות</button>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Right side: Keep only group selector and theme toggle */}
        <div className="flex items-center gap-3">
          {status === 'authenticated' && <FamilyMenu />}
          <button onClick={toggle} className="px-2 py-1 rounded border text-sm dark:border-gray-700">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}

