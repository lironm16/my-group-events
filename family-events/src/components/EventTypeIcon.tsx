"use client";

type Props = { type: 'shabat_eve' | 'holiday_eve' | 'holiday' | 'custom'; size?: number };

export default function EventTypeIcon({ type, size = 80 }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const color = 'currentColor';
  switch (type) {
    case 'shabat_eve':
      // Candle icon
      return (
        <svg {...common} aria-label="ערב שישי">
          <rect x="7" y="9" width="4" height="9" rx="1.2" stroke={color} />
          <path d="M9 9V7" stroke={color} />
          <path d="M9 5c0-1.2 1-2 1.5-2.6.5.6 1.5 1.4 1.5 2.6 0 1-1 2-2 2s-1.9-1-2-2Z" fill={color} stroke={color} />
          <rect x="13" y="9.8" width="4" height="8.2" rx="1.2" stroke={color} />
          <path d="M15 9.8V8.2" stroke={color} />
        </svg>
      );
    case 'holiday_eve':
      // Sparkles icon
      return (
        <svg {...common} aria-label="ערב חג">
          <path d="M12 2l1.8 4.2L18 8l-4.2 1.8L12 14l-1.8-4.2L6 8l4.2-1.8L12 2Z" stroke={color} />
          <path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Z" stroke={color} />
          <path d="M19 12l.8 1.8L21.5 14l-1.7.7L19 16.5l-.8-1.8L16.5 14l1.7-.7L19 12Z" stroke={color} />
        </svg>
      );
    case 'holiday':
      // Star icon
      return (
        <svg {...common} aria-label="חג">
          <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.9l.9-5.4L4.2 8.7l5.4-.8L12 3Z" stroke={color} />
        </svg>
      );
    default:
      // Target/custom icon
      return (
        <svg {...common} aria-label="מותאם אישית">
          <circle cx="12" cy="12" r="7.5" stroke={color} />
          <circle cx="12" cy="12" r="4" stroke={color} />
          <circle cx="12" cy="12" r="1.2" fill={color} stroke={color} />
        </svg>
      );
  }
}

