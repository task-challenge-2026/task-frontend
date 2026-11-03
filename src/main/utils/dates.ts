const LONDON = 'Europe/London';

export interface DueDateParts {
  day?: string;
  month?: string;
  year?: string;
  hour?: string;
  minute?: string;
}

export type DueDateResult = { ok: true; iso: string } | { ok: false; code: 'REQUIRED' | 'INVALID_FORMAT' };

function londonOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string): number => Number(parts.find(p => p.type === type)?.value);
  const londonAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return (londonAsUtc - utcMs) / 60000;
}

export function londonToUtcIso(year: number, month: number, day: number, hour: number, minute: number): string {
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wallClock - londonOffsetMinutes(wallClock) * 60000;
  utc = wallClock - londonOffsetMinutes(utc) * 60000;
  return new Date(utc).toISOString();
}

export function parseDueDate(parts: DueDateParts): DueDateResult {
  const values = [parts.day, parts.month, parts.year, parts.hour, parts.minute].map(v => (v ?? '').trim());
  if (values.every(v => v === '')) {
    return { ok: false, code: 'REQUIRED' };
  }
  if (values.some(v => !/^\d+$/.test(v))) {
    return { ok: false, code: 'INVALID_FORMAT' };
  }

  const [day, month, year, hour, minute] = values.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const realDate =
    year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  const realTime = hour <= 23 && minute <= 59;
  if (!realDate || !realTime) {
    return { ok: false, code: 'INVALID_FORMAT' };
  }

  return { ok: true, iso: londonToUtcIso(year, month, day, hour, minute) };
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}
