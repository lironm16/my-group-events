"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useSession, signOut } from 'next-auth/react';
import GroupMenu from '@/components/GroupMenu';

export default function Nav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const linkCls = (href: string) =>
    [
      'px-2 py-1 rounded transition-colors',
      pathname === href
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
    ].join(' ');

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const homeHref = status === 'authenticated' ? '/events' : '/';
            const isActive = pathname === '/' || pathname.startsWith('/events');
            const cls = [
              'px-2 py-1 rounded transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
            ].join(' ');
            return <Link href={homeHref} className={cls}>בית</Link>;
          })()}
          {status === 'authenticated' && (
            <Link href="/events/new" className="px-2 py-1 bg-green-600 text-white rounded">יצירת אירוע</Link>
          )}
          <Link href="/family" className={linkCls('/family')}>משפחה</Link>
          {status === 'authenticated' && <Link href="/settings" className={linkCls('/settings')}>הגדרות</Link>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {status !== 'authenticated' ? (
            <Link href="/signin" className="px-3 py-1 bg-blue-600 text-white rounded">התחברות</Link>
          ) : (
            <button onClick={() => signOut({ callbackUrl: '/' })} className="px-3 py-1 bg-gray-200 dark:bg-gray-800 dark:text-gray-100 rounded">התנתקות</button>
          )}
        </div>
      </div>
    </nav>
  );
}

