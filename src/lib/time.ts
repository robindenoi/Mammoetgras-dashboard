import { TZDate } from "@date-fns/tz";
import { format, startOfWeek, addDays, startOfDay, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";

export const TZ = "Europe/Amsterdam";

// Twee intervallen overlappen (half-open): aStart < bEnd && aEnd > bStart.
export function overlaps(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && ae > bs;
}

// Wall-clock string uit een <input type="datetime-local"> (bv "2026-07-22T14:30")
// interpreteren als Amsterdamse tijd en omzetten naar een UTC ISO-instant.
export function amsterdamLocalToISO(local: string): string {
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const tz = new TZDate(y, m - 1, d, hh, mm, 0, TZ);
  return new Date(tz.getTime()).toISOString();
}

// Een UTC ISO-instant omzetten naar de waarde voor een datetime-local input,
// weergegeven in Amsterdamse tijd.
export function isoToAmsterdamLocal(iso: string): string {
  const tz = new TZDate(new Date(iso).getTime(), TZ);
  return format(tz, "yyyy-MM-dd'T'HH:mm");
}

export function formatTime(iso: string): string {
  return format(new TZDate(new Date(iso).getTime(), TZ), "HH:mm");
}

export function formatDate(iso: string): string {
  return format(new TZDate(new Date(iso).getTime(), TZ), "d MMM yyyy", {
    locale: nl,
  });
}

export function formatDateTime(iso: string): string {
  return format(new TZDate(new Date(iso).getTime(), TZ), "EEE d MMM HH:mm", {
    locale: nl,
  });
}

export function formatDayLabel(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  return format(new TZDate(t, TZ), "EEEE d MMMM");
}

// De 7 dagen (ma-zo) van de week waar `ref` in valt, in Amsterdamse tijd.
export function weekDays(ref: Date = new Date()): TZDate[] {
  const tzRef = new TZDate(ref.getTime(), TZ);
  const monday = startOfWeek(tzRef, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function sameAmsterdamDay(iso: string, day: Date): boolean {
  return isSameDay(
    new TZDate(new Date(iso).getTime(), TZ),
    new TZDate(day.getTime(), TZ)
  );
}

export function dayKey(iso: string): string {
  return format(new TZDate(new Date(iso).getTime(), TZ), "yyyy-MM-dd");
}

export { startOfDay, addDays };
