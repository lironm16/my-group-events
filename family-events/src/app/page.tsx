import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const signedIn = !!session?.user;
  return (
    <main className="container-page">
      <section className="max-w-3xl mx-auto text-center py-12">
        <div className="grid grid-cols-4 gap-3 mb-4 justify-items-center">
          {Array.from({ length: 16 }).map((_, i) => {
            const seed = Math.random().toString(36).slice(2, 10);
            const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`;
            return <Image key={i} src={url} alt="family avatar" width={56} height={56} />;
          })}
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3">
          <span>אירועי משפחה, פשוט</span>
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">ניהול אירועים, הזמנות ואישורי הגעה במקום אחד.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {signedIn ? (
            <Link href="/events" className="px-5 py-3 bg-blue-600 text-white rounded">לעבור לאירועים</Link>
          ) : (
            <Link href="/signin" className="px-5 py-3 bg-blue-600 text-white rounded">התחברות / הרשמה</Link>
          )}
        </div>
      </section>
    </main>
  );
}

