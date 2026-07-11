/**
 * Date & Time pack — timestamps, deltas, formatting, calendars.
 * Uses the device clock only; fully offline.
 */
import { ToolboxTool } from '../types';

const t = (
  id: string,
  name: string,
  description: string,
  inputHint: string,
  run: (s: string) => string,
  tags: string[] = [],
  example?: string
): ToolboxTool => ({
  id, name, description, category: 'datetime', tags: ['datetime', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const DAY = 86400000;

export const datetimePack: ToolboxTool[] = [
  t('dt-now', 'Current Timestamp', 'Show the current time in several formats.', 'press run (input ignored)', () => {
    const d = new Date();
    return `ISO 8601: ${d.toISOString()}\nUnix (s): ${Math.floor(d.getTime() / 1000)}\nUnix (ms): ${d.getTime()}\nLocal: ${d.toString()}\nUTC: ${d.toUTCString()}`;
  }, ['now']),
  t('dt-unix-to-date', 'Unix → Date', 'Convert a Unix timestamp (s or ms) to a date.', 'a unix timestamp', (s) => {
    const n = parseInt(s.trim(), 10); if (isNaN(n)) return 'Enter a Unix timestamp.';
    const d = new Date(String(n).length > 10 ? n : n * 1000);
    return `ISO: ${d.toISOString()}\nLocal: ${d.toString()}\nUTC: ${d.toUTCString()}`;
  }, ['unix'], '1700000000'),
  t('dt-date-to-unix', 'Date → Unix', 'Convert a date string to a Unix timestamp.', 'a date (e.g. 2025-01-15)', (s) => {
    const d = new Date(s.trim()); if (isNaN(d.getTime())) return 'Could not parse date. Try 2025-01-15 or 2025-01-15T10:30:00Z.';
    return `Unix (s): ${Math.floor(d.getTime() / 1000)}\nUnix (ms): ${d.getTime()}`;
  }, ['unix'], '2025-01-15T10:30:00Z'),
  t('dt-diff', 'Date Difference', 'Time between two dates. Format: date1::date2', 'date1::date2', (s) => {
    const [a, b] = s.split('::').map((x) => new Date(x.trim()));
    if (isNaN(a?.getTime()) || isNaN(b?.getTime())) return 'Format: date1::date2  (e.g. 2025-01-01::2025-12-31)';
    const ms = Math.abs(b.getTime() - a.getTime());
    const days = Math.floor(ms / DAY);
    const years = Math.floor(days / 365.25);
    return `Difference:\n${days} days\n${Math.floor(days / 7)} weeks\n${(days / 30.44).toFixed(1)} months\n${(days / 365.25).toFixed(2)} years${years >= 1 ? '' : ''}\n${Math.floor(ms / 3600000)} hours\n${Math.floor(ms / 60000)} minutes`;
  }, ['diff'], '2025-01-01::2025-12-31'),
  t('dt-add-days', 'Add / Subtract Days', 'Shift a date by N days. Format: date::±days', 'date::days', (s) => {
    const [ds, n] = s.split('::'); const d = new Date((ds || '').trim()); const days = parseInt(n, 10);
    if (isNaN(d.getTime()) || isNaN(days)) return 'Format: date::±days  (e.g. 2025-01-15::90)';
    d.setDate(d.getDate() + days);
    return `${d.toISOString().slice(0, 10)} (${d.toLocaleDateString('en-US', { weekday: 'long' })})`;
  }, ['calc'], '2025-01-15::90'),
  t('dt-age', 'Age Calculator', 'Compute age from a birth date.', 'birth date (YYYY-MM-DD)', (s) => {
    const b = new Date(s.trim()); if (isNaN(b.getTime())) return 'Enter a birth date (YYYY-MM-DD).';
    const now = new Date();
    let years = now.getFullYear() - b.getFullYear();
    let months = now.getMonth() - b.getMonth();
    let days = now.getDate() - b.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    const totalDays = Math.floor((now.getTime() - b.getTime()) / DAY);
    return `${years} years, ${months} months, ${days} days\n(${totalDays.toLocaleString()} days total)`;
  }, ['age'], '1990-05-20'),
  t('dt-weekday', 'Day of Week', 'What weekday falls on a given date.', 'a date', (s) => {
    const d = new Date(s.trim()); if (isNaN(d.getTime())) return 'Enter a date (e.g. 2025-07-04).';
    return `${s.trim()} is a ${d.toLocaleDateString('en-US', { weekday: 'long' })}.`;
  }, ['calendar'], '2025-07-04'),
  t('dt-week-number', 'ISO Week Number', 'Find the ISO-8601 week number of a date.', 'a date', (s) => {
    const d = new Date(s.trim()); if (isNaN(d.getTime())) return 'Enter a date.';
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${s.trim()} → ISO week ${week} of ${target.getUTCFullYear()}`;
  }, ['calendar'], '2025-07-04'),
  t('dt-countdown', 'Countdown', 'Time remaining until a future date.', 'a future date/time', (s) => {
    const d = new Date(s.trim()); if (isNaN(d.getTime())) return 'Enter a future date/time.';
    const ms = d.getTime() - Date.now();
    if (ms < 0) return `${s.trim()} was ${Math.floor(-ms / DAY)} days ago.`;
    const days = Math.floor(ms / DAY), hrs = Math.floor((ms % DAY) / 3600000), mins = Math.floor((ms % 3600000) / 60000);
    return `${days} days, ${hrs} hours, ${mins} minutes remaining.`;
  }, ['countdown'], '2026-01-01T00:00:00'),
  t('dt-duration-format', 'Humanize Duration', 'Convert seconds into a readable duration.', 'seconds', (s) => {
    let sec = parseInt(s.trim(), 10); if (isNaN(sec) || sec < 0) return 'Enter a number of seconds.';
    const units: [string, number][] = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
    const parts: string[] = [];
    for (const [name, size] of units) { const v = Math.floor(sec / size); if (v) { parts.push(`${v} ${name}${v > 1 ? 's' : ''}`); sec %= size; } }
    return parts.length ? parts.join(', ') : '0 seconds';
  }, ['format'], '90061'),
  t('dt-leap-year', 'Leap Year Check', 'Is a given year a leap year?', 'a year', (s) => {
    const y = parseInt(s.trim(), 10); if (isNaN(y)) return 'Enter a year.';
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return `${y} is ${leap ? '' : 'not '}a leap year${leap ? ` (February has 29 days)` : ''}.`;
  }, ['calendar'], '2024'),
  t('dt-business-days', 'Business Days Between', 'Count weekdays between two dates. Format: date1::date2', 'date1::date2', (s) => {
    const [a, b] = s.split('::').map((x) => new Date(x.trim()));
    if (isNaN(a?.getTime()) || isNaN(b?.getTime())) return 'Format: date1::date2';
    const [start, end] = a < b ? [a, b] : [b, a];
    let count = 0; const cur = new Date(start);
    while (cur <= end) { const dow = cur.getDay(); if (dow !== 0 && dow !== 6) count++; cur.setDate(cur.getDate() + 1); }
    return `${count} business days (excluding weekends).`;
  }, ['calc'], '2025-01-01::2025-01-31'),
  t('dt-timezone-offset', 'Timezone Offset', 'Show the device timezone and UTC offset.', 'press run (input ignored)', () => {
    const d = new Date();
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    return `Zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\nUTC offset: ${sign}${String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')}:${String(Math.abs(off) % 60).padStart(2, '0')}`;
  }, ['timezone']),
  t('dt-world-clock', 'World Clock', 'Current time in IANA zones (uses the built-in offline tz database).', 'zones comma-sep', (s) => {
    const zones = s.split(',').map((z) => z.trim()).filter(Boolean);
    if (!zones.length) return 'Enter IANA zones, e.g. America/New_York, Europe/London, Asia/Tokyo';
    const now = new Date();
    const rows = zones.map((z) => {
      try {
        const time = new Intl.DateTimeFormat('en-GB', { timeZone: z, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
        return `${z.padEnd(22)} ${time}`;
      } catch { return `${z.padEnd(22)} (unknown zone)`; }
    });
    return rows.join('\n');
  }, ['timezone', 'clock'], 'America/New_York, Europe/London, Asia/Tokyo'),
  t('dt-meeting-overlap', 'Meeting Overlap Finder', 'Shared 09:00–17:00 window across IANA zones, shown per zone.', 'zones comma-sep', (s) => {
    const zones = s.split(',').map((z) => z.trim()).filter(Boolean);
    if (zones.length < 2) return 'Enter at least two IANA zones, e.g. America/New_York, Europe/Berlin';
    const now = new Date();
    const offsetMin = (tz: string): number | null => {
      try {
        const loc = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        return Math.round((loc.getTime() - utc.getTime()) / 60000);
      } catch { return null; }
    };
    const offs = zones.map((z) => ({ z, off: offsetMin(z) }));
    const badZone = offs.find((o) => o.off === null);
    if (badZone) return `Unknown zone: ${badZone.z}`;
    // Business hours 9:00–17:00 local → UTC minutes window per zone.
    let lo = -Infinity, hi = Infinity;
    offs.forEach((o) => { lo = Math.max(lo, 9 * 60 - o.off!); hi = Math.min(hi, 17 * 60 - o.off!); });
    if (hi <= lo) return `No 9–17 overlap across:\n${offs.map((o) => `  ${o.z} (UTC${o.off! >= 0 ? '+' : ''}${o.off! / 60})`).join('\n')}\nSomeone has to flex outside business hours.`;
    const fmt = (utcMin: number, off: number) => {
      const m = ((utcMin + off) % 1440 + 1440) % 1440;
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    };
    return [
      `Shared window: ${(hi - lo) / 60} h`,
      ...offs.map((o) => `  ${o.z.padEnd(22)} ${fmt(lo, o.off!)}–${fmt(hi, o.off!)} local`),
    ].join('\n');
  }, ['timezone', 'meeting'], 'America/New_York, Europe/Berlin, Asia/Tokyo'),
];
