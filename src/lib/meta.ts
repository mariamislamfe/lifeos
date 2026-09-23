import type {
  ApplicationStatus,
  ApplicationType,
  CourseKind,
  EventKind,
  FutureCategory,
  Horizon,
  IdeaStatus,
  Priority,
  ProjectStatus,
  TaskStatus,
  WishStatus,
} from "./types";

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];
export const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
export const PRIORITY_STYLE: Record<Priority, string> = {
  low: "text-subtle",
  medium: "text-sky-600 dark:text-sky-400",
  high: "text-amber-600 dark:text-amber-400",
  urgent: "text-rose-600 dark:text-rose-400",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { todo: "Todo", in_progress: "In progress", done: "Done" };

/** Palette used for categories, courses and projects. Full class names so Tailwind can see them. */
export const COLORS = {
  iris: { dot: "bg-indigo-500", soft: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-300", border: "border-indigo-500", bar: "bg-indigo-500" },
  sky: { dot: "bg-sky-500", soft: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500", bar: "bg-sky-500" },
  teal: { dot: "bg-teal-500", soft: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500", bar: "bg-teal-500" },
  emerald: { dot: "bg-emerald-500", soft: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500", bar: "bg-emerald-500" },
  amber: { dot: "bg-amber-500", soft: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500", bar: "bg-amber-500" },
  orange: { dot: "bg-orange-500", soft: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500", bar: "bg-orange-500" },
  rose: { dot: "bg-rose-500", soft: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500", bar: "bg-rose-500" },
  pink: { dot: "bg-pink-500", soft: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500", bar: "bg-pink-500" },
  violet: { dot: "bg-violet-500", soft: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500", bar: "bg-violet-500" },
  slate: { dot: "bg-zinc-400", soft: "bg-zinc-500/10", text: "text-zinc-600 dark:text-zinc-300", border: "border-zinc-500", bar: "bg-zinc-400" },
} as const;
export type ColorName = keyof typeof COLORS;
export const COLOR_NAMES = Object.keys(COLORS) as ColorName[];
export function color(name: string | null | undefined) {
  return COLORS[(name as ColorName) ?? "slate"] ?? COLORS.slate;
}

export const COURSE_KIND_LABEL: Record<CourseKind, string> = {
  lecture: "Lecture",
  section: "Section",
  lab: "Lab",
  tutorial: "Tutorial",
};

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  meeting: "Meeting",
  call: "Call",
  interview: "Interview",
  university: "University event",
  exam: "Exam",
  workshop: "Workshop",
  conference: "Conference",
  personal: "Personal",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};
export const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  idea: "text-violet-600 dark:text-violet-300 bg-violet-500/10",
  planned: "text-sky-700 dark:text-sky-300 bg-sky-500/10",
  active: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
  paused: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
  completed: "text-fg bg-surface-3",
  archived: "text-subtle bg-surface-3",
};

export const APPLICATION_TYPE_LABEL: Record<ApplicationType, string> = {
  competition: "Competition",
  scholarship: "Scholarship",
  internship: "Internship",
  program: "Program",
  university: "University",
  fellowship: "Fellowship",
  hackathon: "Hackathon",
  conference: "Conference",
  other: "Other",
};
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "interested",
  "researching",
  "preparing",
  "applied",
  "interview",
  "accepted",
  "waitlisted",
  "rejected",
  "withdrawn",
];
export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  interested: "Interested",
  researching: "Researching",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};
export const APPLICATION_STATUS_DOT: Record<ApplicationStatus, string> = {
  interested: "bg-zinc-400",
  researching: "bg-sky-500",
  preparing: "bg-amber-500",
  applied: "bg-indigo-500",
  interview: "bg-violet-500",
  accepted: "bg-emerald-500",
  rejected: "bg-rose-500",
  waitlisted: "bg-orange-400",
  withdrawn: "bg-zinc-300 dark:bg-zinc-600",
};
export const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = ["interested", "researching", "preparing", "applied", "interview", "waitlisted"];

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  brain_dump: "Brain dump",
  interesting: "Interesting",
  research: "Research",
  building: "Building",
  archived: "Archived",
};

export const FUTURE_CATEGORY_LABEL: Record<FutureCategory, string> = {
  learn: "Learn",
  travel: "Travel",
  build: "Build",
  apply: "Apply",
  buy: "Buy",
  project: "Project",
  event: "Event",
  skill: "Skill",
  other: "Other",
};
export const HORIZON_LABEL: Record<Horizon, string> = { month: "This month", year: "This year", someday: "Someday" };

export const WISH_STATUS_LABEL: Record<WishStatus, string> = {
  want: "Want",
  planning: "Planning to buy",
  saving: "Saving for",
  bought: "Bought",
};

export const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "SAR", "AED"];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
