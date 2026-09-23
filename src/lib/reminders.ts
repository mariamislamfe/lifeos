export const REMINDER_PRESETS: { minutes: number; label: string; short: string }[] = [
  { minutes: 10080, label: "1 week before", short: "1w" },
  { minutes: 4320, label: "3 days before", short: "3d" },
  { minutes: 1440, label: "1 day before", short: "1d" },
  { minutes: 720, label: "12 hours before", short: "12h" },
  { minutes: 120, label: "2 hours before", short: "2h" },
  { minutes: 60, label: "1 hour before", short: "1h" },
  { minutes: 30, label: "30 minutes before", short: "30m" },
];

export function offsetLabel(minutes: number) {
  const preset = REMINDER_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  if (minutes === 0) return "At time";
  if (minutes % 1440 === 0) return `${minutes / 1440} days before`;
  if (minutes % 60 === 0) return `${minutes / 60} hours before`;
  return `${minutes} minutes before`;
}

export function offsetShort(minutes: number) {
  const preset = REMINDER_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.short;
  if (minutes === 0) return "0";
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export function nextRepeat(date: Date, repeat: "daily" | "weekly" | "monthly") {
  const d = new Date(date);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  if (repeat === "weekly") d.setDate(d.getDate() + 7);
  if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  return d;
}
