"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useSession, signOut } from 'next-auth/react';
import GroupMenu from '@/components/GroupMenu';
import { useEffect, useRef, useState } from 'react';

export default function Nav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2" />
        <div className="flex items-center gap-2">
          {status === 'authenticated' && (
            <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-200 mr-2">
              {(() => {
                const name = (session?.user as any)?.name || '';
                const first = String(name).trim().split(' ')[0] || '';
                const h = new Date().getHours();
                const g = h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 18 ? 'צהריים טובים' : 'ערב טוב';
                return `${g}${first ? ', ' + first : ''}`;
              })()}
            </span>
          )}
          {status === 'authenticated' && <GroupMenu />}
          <button onClick={toggle} className="px-2 py-1 rounded border text-sm dark:border-gray-700">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {status === 'authenticated' && (
            <div className="relative" ref={menuRef}>
              <button
                aria-label="תפריט"
                className="px-3 py-1 rounded border text-sm dark:border-gray-700"
                onClick={() => setMenuOpen((o) => !o)}
              >☰</button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden z-50">
                  <Link href={status === 'authenticated' ? '/events' : '/'} className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={()=>setMenuOpen(false)}>בית</Link>
                  <Link href="/events/new" className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={()=>setMenuOpen(false)}>יצירת אירוע</Link>
                  <Link href="/settings" className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={()=>setMenuOpen(false)}>הגדרות</Link>
                  <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
                  <button className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600" onClick={()=>{ setMenuOpen(false); signOut({ callbackUrl: '/' }); }}>התנתקות</button>
                </div>
              )}
            </div>
          )}
          {/* No menu or login button when logged out */}
        </div>
      </div>
    </nav>
  );
}

