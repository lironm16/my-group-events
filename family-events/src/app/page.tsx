import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const signedIn = !!session?.user;
  return (
    <main className="container-page">
      <section className="max-w-3xl mx-auto text-center py-12">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Image src="https://api.dicebear.com/9.x/adventurer/svg?seed=Maria" alt="אישה" width={56} height={56} />
          <Image src="https://api.dicebear.com/9.x/adventurer/svg?seed=la86p9t0" alt="גבר" width={56} height={56} />
          <Image src="https://api.dicebear.com/9.x/adventurer/svg?seed=Emery" alt="מותאם" width={56} height={56} />
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

