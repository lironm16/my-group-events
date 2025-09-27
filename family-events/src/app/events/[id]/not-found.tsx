import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container-page space-y-4">
      <h1 className="text-2xl font-bold">האירוע לא נמצא</h1>
      <p className="text-gray-600 dark:text-gray-300">ייתכן שהקישור שגוי או שהאירוע הוסר.</p>
      <Link className="inline-block px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded" href="/events">חזרה לרשימת האירועים</Link>
    </main>
  );
}

