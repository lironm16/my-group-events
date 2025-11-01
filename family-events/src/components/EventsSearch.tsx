"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
};

export default function EventsSearch({ value, onChange, onClear, placeholder = 'חיפוש אירועים...' }: Props) {
  const clear = () => {
    if (onClear) onClear();
    else onChange('');
  };
  const update = (next: string) => {
    onChange(next);
  };
  return (
    <div className="max-w-xl relative">
      <input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        onInput={(e) => update((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="w-full border pl-3 pr-10 sm:pl-2 sm:pr-10 py-3 sm:py-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow shadow-sm text-base sm:text-sm"
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute inset-y-0 left-0 flex items-center pl-3 pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-xl"
          aria-label="ניקוי החיפוש"
        >
          ✕
        </button>
      )}
    </div>
  );
}

