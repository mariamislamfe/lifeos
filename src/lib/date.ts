import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";

type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** User preference (Settings); defaults to Saturday, the usual start of the Egyptian academic week. */
export function weekStartsOn(): WeekDay {
  try {
    const v = Number(localStorage.getItem("lifeos:weekStart"));
    if (localStorage.getItem("lifeos:weekStart") !== null && v >= 0 && v <= 6) return v as WeekDay;
  } catch {}
  return 6;
}

export function toISODate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function combineDateTime(date: string, time?: string | null) {
  const d = parseISODate(date);
  if (time) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
  }
  return d;
}

export function toTimeString(d: Date) {
  return format(d, "HH:mm");
}

export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function dayProgress(d: Date) {
  const mins = d.getHours() * 60 + d.getMinutes();
  return Math.round((mins / 1440) * 100);
}

export function weekStart(d: Date) {
  return startOfWeek(d, { weekStartsOn: weekStartsOn() });
}

/** "In 1 hour 25 minutes", "Tomorrow", "In 3 days", "2 hours ago"… */
export function relativeLabel(target: Date, now: Date, allDay = false): string {
  const days = differenceInCalendarDays(target, now);
  if (allDay || Math.abs(differenceInMinutes(target, now)) >= 60 * 18 || days !== 0) {
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days === -1) return "Yesterday";
    if (days > 1 && days < 7) return `In ${days} days`;
    if (days < -1 && days > -7) return `${-days} days ago`;
    if (days >= 7 && days < 14) return "Next week";
    if (days > 0) return `In ${Math.round(days / 7)} weeks`;
    return format(target, "MMM d");
  }
  const diff = differenceInMinutes(target, now);
  const abs = Math.abs(diff);
  if (abs < 1) return "Now";
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts = [h ? `${h} ${h === 1 ? "hour" : "hours"}` : "", m ? `${m} ${m === 1 ? "minute" : "minutes"}` : ""]
    .filter(Boolean)
    .join(" ");
  return diff > 0 ? `In ${parts}` : `${parts} ago`;
}

export function shortRelative(target: Date, now: Date): string {
  const diff = differenceInMinutes(target, now);
  const abs = Math.abs(diff);
  let s: string;
  if (abs < 60) s = `${abs}m`;
  else if (abs < 60 * 24) s = `${Math.round(abs / 60)}h`;
  else s = `${Math.round(abs / 1440)}d`;
  return diff >= 0 ? `in ${s}` : `${s} ago`;
}

export type Urgency = "overdue" | "today" | "soon" | "upcoming" | "later";

export function urgencyOf(due: Date, now: Date, allDay = false): Urgency {
  if (allDay ? differenceInCalendarDays(due, now) < 0 : due.getTime() < now.getTime()) return "overdue";
  const days = differenceInCalendarDays(due, now);
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  if (days <= 14) return "upcoming";
  return "later";
}

export function friendlyDate(d: Date, now = new Date()) {
  const days = differenceInCalendarDays(d, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return format(d, "EEEE");
  if (d.getFullYear() === now.getFullYear()) return format(d, "EEE, MMM d");
  return format(d, "MMM d, yyyy");
}

export function friendlyDateTime(d: Date, now = new Date()) {
  return `${friendlyDate(d, now)} · ${toTimeString(d)}`;
}

export function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return { date: toISODate(d), time: toTimeString(d) };
}

export function dateRange(from: Date, count: number) {
  return Array.from({ length: count }, (_, i) => addDays(startOfDay(from), i));
}

export { isSameDay, addDays, startOfDay, format, differenceInCalendarDays, differenceInMinutes };
