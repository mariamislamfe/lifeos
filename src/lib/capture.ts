import { addDays } from "date-fns";
import { toISODate } from "./date";

export type CaptureKind = "task" | "deadline" | "idea" | "purchase" | "event" | "note";

export interface CaptureGuess {
  kind: CaptureKind;
  title: string;
  date: string | null;
  time: string | null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parseDate(text: string, now: Date): { date: string | null; match: string | null } {
  const t = text.toLowerCase();
  if (/\btoday\b|\btonight\b/.test(t)) return { date: toISODate(now), match: t.match(/\btoday\b|\btonight\b/)![0] };
  if (/\btomorrow\b/.test(t)) return { date: toISODate(addDays(now, 1)), match: "tomorrow" };
  if (/\bnext week\b/.test(t)) return { date: toISODate(addDays(now, 7)), match: "next week" };

  const monthFirst = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(st|nd|rd|th)?\b/);
  const dayFirst = t.match(/\b(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  const m = monthFirst
    ? { month: MONTHS.indexOf(monthFirst[1]), day: Number(monthFirst[2]), match: monthFirst[0] }
    : dayFirst
      ? { month: MONTHS.indexOf(dayFirst[3]), day: Number(dayFirst[1]), match: dayFirst[0] }
      : null;
  if (m && m.day >= 1 && m.day <= 31) {
    let d = new Date(now.getFullYear(), m.month, m.day);
    if (d.getTime() < addDays(now, -1).getTime()) d = new Date(now.getFullYear() + 1, m.month, m.day);
    return { date: toISODate(d), match: m.match };
  }

  const wd = t.match(/\b(?:on |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (wd) {
    const target = DAYS.indexOf(wd[1]);
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return { date: toISODate(addDays(now, diff)), match: wd[0] };
  }
  return { date: null, match: null };
}

function parseTime(text: string): { time: string | null; match: string | null } {
  const t = text.toLowerCase();
  const ampm = t.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (ampm[3] === "pm") h += 12;
    return { time: `${String(h).padStart(2, "0")}:${ampm[2] ?? "00"}`, match: ampm[0] };
  }
  const h24 = t.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (h24) return { time: `${h24[1].padStart(2, "0")}:${h24[2]}`, match: h24[0] };
  return { time: null, match: null };
}

/** A light, local guess at what a quick capture is — never forced, only suggested. */
export function guessCapture(raw: string, now = new Date()): CaptureGuess {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const { date, match: dateMatch } = parseDate(text, now);
  const { time, match: timeMatch } = parseTime(text);

  let kind: CaptureKind = "note";
  if (/^(buy|get|order|purchase)\b/.test(lower) || /\bwishlist\b/.test(lower)) kind = "purchase";
  else if (/^idea\b|\bidea for\b|\bidea:/.test(lower)) kind = "idea";
  else if (/\b(deadline|due|submission|submit by|apply by)\b/.test(lower) && date) kind = "deadline";
  else if (/\b(meeting|call with|interview|session with|appointment)\b/.test(lower) && date) kind = "event";
  else if (/^(email|call|text|message|finish|submit|send|write|read|review|prepare|study|fix|update|book|pay|clean|practice|ask|finalize|register)\b|\bneed to\b|\bhave to\b|\bremember to\b/.test(lower))
    kind = "task";
  else if (date) kind = "task";

  let title = text;
  if (kind === "purchase") title = text.replace(/^(buy|get|order|purchase)\s+/i, "");
  if (kind === "idea") title = text.replace(/^idea(\s+for)?\s*:?\s*/i, "").replace(/^\w/, (c) => c.toUpperCase());
  if (kind === "task") title = text.replace(/^i\s+(need|have)\s+to\s+/i, "").replace(/^remember\s+to\s+/i, "").replace(/^\w/, (c) => c.toUpperCase());
  for (const m of [dateMatch, timeMatch]) if (m && kind !== "note") title = title.replace(new RegExp(`\\s*(on|by|at)?\\s*${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "");
  title = title.trim().replace(/[\s,.-]+$/, "") || text;

  return { kind, title, date, time };
}
