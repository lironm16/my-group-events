import type { Prisma } from '@prisma/client';
import type { HolidayEntry } from './holidays';
import { isHoliday } from './holidays';

export type RecurrenceConfig = {
  frequency: 'WEEKLY';
  interval: number;
  skipHolidays: boolean;
  until?: Date | null;
  noEndDate?: boolean;
};

export type EventTemplateData = {
  title: string;
  description: string | null;
  location: string | null;
  image: string | null;
  externalLink: string | null;
  holidayKey: string | null;
  visibleToAll: boolean;
  rsvpOpenToAll: boolean;
  hostId: string;
  coHostIds: string[];
  guestUserIds: string[];
  familyId: string | null;
};

type NextOccurrenceResult = {
  start: Date;
  end: Date | null;
};

export function computeNextOccurrence(
  start: Date,
  config: RecurrenceConfig,
  durationMs?: number | null,
  holidays?: HolidayEntry[]
): NextOccurrenceResult | null {
  const interval = Math.max(1, Number.isFinite(config.interval) ? config.interval : 1);
  if (config.frequency !== 'WEEKLY') return null;

  const until = config.until ?? null;
  const skipHolidays = !!config.skipHolidays;
  const baseDuration = typeof durationMs === 'number' && Number.isFinite(durationMs) ? Math.max(0, durationMs) : null;

  let cursor = new Date(start);
  let guard = 0;
  while (guard < 520) { // safeguard ~10 years of weekly occurrences
    cursor = new Date(cursor.getTime());
    cursor.setDate(cursor.getDate() + 7 * interval);
    guard += 1;
    if (!config.noEndDate && until && cursor > until) {
      return null;
    }
    if (skipHolidays && holidays && holidays.length && isHoliday(cursor, holidays)) {
      continue;
    }
    const end = baseDuration != null ? new Date(cursor.getTime() + baseDuration) : null;
    return { start: cursor, end };
  }
  return null;
}

export function computeReadyAt(start: Date, end: Date | null, durationMs?: number | null): Date {
  if (end) return new Date(end);
  const baseDuration = typeof durationMs === 'number' && Number.isFinite(durationMs) ? Math.max(durationMs, 0) : null;
  if (baseDuration && baseDuration > 0) {
    return new Date(start.getTime() + baseDuration);
  }
  // Fallback: consider event "done" 1 hour after start when no duration specified
  return new Date(start.getTime() + 60 * 60 * 1000);
}

export function deriveDurationMs(start: Date, end?: Date | null): number | null {
  if (!end) return null;
  const delta = end.getTime() - start.getTime();
  if (!Number.isFinite(delta) || delta <= 0) return null;
  return delta;
}

export function toJsonValue(value: unknown): Prisma.JsonValue {
  return value as Prisma.JsonValue;
}

export function parseTemplateData(value: unknown): EventTemplateData | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const requiredKeys: (keyof EventTemplateData)[] = ['title', 'description', 'location', 'image', 'externalLink', 'holidayKey', 'visibleToAll', 'rsvpOpenToAll', 'hostId', 'coHostIds', 'guestUserIds', 'familyId'];
  for (const key of requiredKeys) {
    if (!(key in raw)) return null;
  }
  return {
    title: String(raw.title ?? ''),
    description: raw.description == null ? null : String(raw.description),
    location: raw.location == null ? null : String(raw.location),
    image: raw.image == null ? null : String(raw.image),
    externalLink: raw.externalLink == null ? null : String(raw.externalLink),
    holidayKey: raw.holidayKey == null ? null : String(raw.holidayKey),
    visibleToAll: !!raw.visibleToAll,
    rsvpOpenToAll: !!raw.rsvpOpenToAll,
    hostId: String(raw.hostId ?? ''),
    coHostIds: Array.isArray(raw.coHostIds) ? raw.coHostIds.filter((id): id is string => typeof id === 'string') : [],
    guestUserIds: Array.isArray(raw.guestUserIds) ? raw.guestUserIds.filter((id): id is string => typeof id === 'string') : [],
    familyId: raw.familyId == null ? null : String(raw.familyId),
  };
}

export function buildTemplateData(input: {
  title: string;
  description: string | null;
  location: string | null;
  image: string | null;
  externalLink: string | null;
  holidayKey: string | null;
  visibleToAll: boolean;
  rsvpOpenToAll: boolean;
  hostId: string;
  coHostIds?: string[];
  guestUserIds?: string[];
  familyId: string | null;
}): EventTemplateData {
  return {
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    image: input.image ?? null,
    externalLink: input.externalLink ?? null,
    holidayKey: input.holidayKey ?? null,
    visibleToAll: !!input.visibleToAll,
    rsvpOpenToAll: !!input.rsvpOpenToAll,
    hostId: input.hostId,
    coHostIds: Array.isArray(input.coHostIds) ? input.coHostIds.filter((id) => typeof id === 'string') : [],
    guestUserIds: Array.isArray(input.guestUserIds) ? input.guestUserIds.filter((id) => typeof id === 'string') : [],
    familyId: input.familyId ?? null,
  };
}

