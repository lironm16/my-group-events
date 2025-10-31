"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function EventsSearch({ value, onChange, placeholder = 'חיפוש אירועים...' }: Props) {
  return (
    <div className="max-w-xl">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border p-3 sm:p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow shadow-sm text-base sm:text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

