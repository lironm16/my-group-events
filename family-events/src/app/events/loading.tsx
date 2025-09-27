export default function Loading() {
  return (
    <main className="container-page space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-9 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 space-y-3">
            <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}

