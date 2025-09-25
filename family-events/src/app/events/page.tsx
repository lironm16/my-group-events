import Link from 'next/link';

export default function EventsPage() {
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אירועים</h1>
        <Link className="px-3 py-2 bg-blue-600 text-white rounded" href="/events/new">אירוע חדש</Link>
      </div>
      <p className="text-gray-600">דף זה יציג את האירועים שלך ושל המשפחה.</p>
    </main>
  );
}

