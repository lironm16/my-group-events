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
          {(() => {
            const roleSeeds = [
              'Maria',        // אישה
              'la86p9t0',     // גבר
              'Emery',        // ילד
              'sjd7uzub',     // ילדה
              'Grandma', 'Grandpa', 'Nana', 'Papa',
              'Baby', 'Infant',
              'Brother', 'Sister',
              'Aunt', 'Uncle',
              'Cousin', 'Father', 'Mother',
              'Theo', 'Maya', 'Liam', 'Noa', 'Eitan', 'Yael'
            ];
            const picks: string[] = [];
            for (let i = 0; i < 16; i++) {
              const seed = roleSeeds[Math.floor(Math.random() * roleSeeds.length)] + '-' + Math.random().toString(36).slice(2,6);
              picks.push(seed);
            }
            return picks.map((seed, i) => (
              <Image key={`${seed}-${i}`} src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`} alt="family avatar" width={56} height={56} />
            ));
          })()}
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3">
          <span>אירועי משפחה, פשוט</span>
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">ניהול אירועים, הזמנות ואישורי הגעה במקום אחד.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {signedIn ? (
            <>
              <Link href="/events" className="px-5 py-3 bg-blue-600 text-white rounded">לעבור לאירועים</Link>
              <Link href="/events/new" className="px-5 py-3 bg-green-600 text-white rounded">יצירת אירוע</Link>
            </>
          ) : (
            <Link href="/signin" className="px-5 py-3 bg-blue-600 text-white rounded">התחברות / הרשמה</Link>
          )}
        </div>
      </section>
    </main>
  );
}

