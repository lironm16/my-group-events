"use client";

import { useTheme } from '@/components/ThemeProvider';

export default function ThemeModeSwitcher({ currentTheme }: { currentTheme?: string }) {
  const { theme, setTheme } = useTheme();
  const mode = (theme ?? (currentTheme as 'light' | 'dark') ?? 'light') as 'light' | 'dark';
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">מצב תצוגה</h2>
      <div className="flex gap-2">
        <button type="button" className={`px-3 py-2 border rounded ${mode==='light'?'bg-gray-100 dark:bg-gray-800':''}`} onClick={()=> setTheme('light')}>בהיר</button>
        <button type="button" className={`px-3 py-2 border rounded ${mode==='dark'?'bg-gray-100 dark:bg-gray-800':''}`} onClick={()=> setTheme('dark')}>כהה</button>
      </div>
      <p className="text-sm text-gray-500">נשמר אוטומטית בהעדפות.</p>
    </div>
  );
}

