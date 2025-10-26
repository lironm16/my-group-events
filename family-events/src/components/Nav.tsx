"use client";
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import { useSession, signOut } from 'next-auth/react';
import FamilyMenu from '@/components/FamilyMenu';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Nav() {
  const { data: session, status } = useSession();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = (href: string) => {
    setMenuOpen(false);
    try {
      router.push(href);
    } catch {
      try { window.location.assign(href); } catch {}
    }
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onRoute = () => setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('popstate', onRoute);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('hashchange', onRoute);
      window.removeEventListener('popstate', onRoute);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side: Menu button */}
        {status === 'authenticated' && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="px-2 py-1 rounded border text-sm dark:border-gray-700"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {status === 'authenticated' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(() => {
                  const img = ((session?.user as any)?.image as string | undefined) || '';
                  if (img && /^https?:/i.test(img)) return img;
                  return 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=Hoodie&clotheColor=Blue03&eyeType=Happy&eyebrowType=Default&mouthType=Smile&skinColor=Light';
                })()}
                alt="avatar"
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <span className="text-lg">☰</span>
            )}
          </button>
          {menuOpen && (
            <div className="absolute z-50 mt-2 right-0 min-w-[180px] rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
              <ul className="text-sm">
                <li>
                  <button
                    type="button"
                    className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => navigate(status === 'authenticated' ? '/events' : '/')}
                  >בית</button>
                </li>
                <li>
                  <button
                    type="button"
                    className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => navigate('/family')}
                  >קבוצות</button>
                </li>
                {status === 'authenticated' && (
                  <li>
                    <button
                      type="button"
                      className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-green-700 dark:text-green-400"
                      onClick={() => navigate('/events/new')}
                    >יצירת אירוע</button>
                  </li>
                )}
                {status === 'authenticated' && (
                  <li>
                    <button
                      type="button"
                      className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => navigate('/settings')}
                    >הגדרות</button>
                  </li>
                )}
                <li className="border-t border-gray-200 dark:border-gray-800" />
                {status !== 'authenticated' ? (
                  <li>
                    <button
                      type="button"
                      className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => navigate('/signin')}
                    >התחברות</button>
                  </li>
                ) : (
                  <li>
                    <button type="button" className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }); }}>התנתקות</button>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        )}

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

