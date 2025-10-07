"use client";

export default function CopyButton({ value, label = 'העתק קישור הזמנה' }: { value: string; label?: string }) {
  return (
    <button
      className="px-3 py-2 bg-blue-600 text-white rounded"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          alert('הקישור הועתק');
        } catch {}
      }}
    >
      {label}
    </button>
  );
}

