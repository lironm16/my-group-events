export default function Loading() {
  return (
    <main className="container-page space-y-4">
      <div className="h-7 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 space-y-3">
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        ))}
      </div>
    </main>
  );
}

