import Link from 'next/link';

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const shareText = `מצטרפים לאירוע? ראו פרטים וקישור: ${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/events/${params.id}`;
  const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">פרטי אירוע</h1>
      <div className="flex gap-2">
        <Link className="px-3 py-2 bg-green-600 text-white rounded" href={wa}>שיתוף בוואטסאפ</Link>
        <Link className="px-3 py-2 bg-gray-200 rounded" href="/events">חזרה</Link>
      </div>
      <p className="text-gray-600">כאן נציג פרטי אירוע ורשימת אישורי הגעה.</p>
    </main>
  );
}

